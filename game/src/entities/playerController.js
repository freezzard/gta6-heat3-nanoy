// Rio Callahan — on-foot movement, car entry, combat and services.
// On foot the player turns with A/D and runs with W along the same Neon
// yaw basis as the cars: fwdX = -sin(yaw), fwdZ = -cos(yaw).
// Wall contact damps speed with a dt-scaled rate so a slide along a wall
// keeps its speed. dt is clamped by the caller.

import { MOVE, applyDamping, moveWithCollision, stepVehicle, yawBasis } from './vehiclePhysics.js';

export function createPlayer(spawn) {
  const player = {
    x: spawn.x,
    z: spawn.z,
    yaw: spawn.yaw || 0,
    speed: 0,
    health: 100,
    cash: 120,
    onFoot: true,
    vehicle: null,
    hasPistol: false,
    ammo: 0,
    reserveAmmo: 0,
    fireTimer: 0,
    reloadTimer: 0,
    meleeTimer: 0,
    enterCooldown: 0,
    hurtFlash: 0,
    muzzle: 0,
    aimX: 0,
    aimZ: 0,
    radius: 0.6,
    lastHurt: -99,
  };
  return player;
}

function nearestVehicle(player, vehicles) {
  let best = null;
  let bestDist = 2.6;
  for (const v of vehicles) {
    const dx = v.x - player.x;
    const dz = v.z - player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < bestDist) {
      bestDist = dist;
      best = v;
    }
  }
  const found = { vehicle: best, dist: bestDist };
  return found;
}

function stepOnFoot(G, dt) {
  const p = G.player;
  const keys = G.keys;
  const turn = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
  p.yaw += turn * 2.9 * dt;
  const basis = yawBasis(p.yaw);
  const forward = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 0.55 : 0);
  if (forward !== 0) {
    p.speed += forward * MOVE.accel * dt;
  }
  if (forward === 0) {
    p.speed = applyDamping(p.speed, MOVE.dampFoot, dt);
  }
  const capped = Math.max(-MOVE.maxFoot * 0.5, Math.min(MOVE.maxFoot, p.speed));
  p.speed = capped;
  const dx = basis.fwdX * p.speed * dt;
  const dz = basis.fwdZ * p.speed * dt;
  const moved = moveWithCollision(p, p.radius, dx, dz, G.city.colliders);
  const blockedX = Math.abs(moved.x - (p.x + dx)) > 0.01;
  const blockedZ = Math.abs(moved.z - (p.z + dz)) > 0.01;
  const stuck = blockedX && blockedZ;
  if (stuck) {
    p.speed = applyDamping(p.speed, 8, dt);
  }
  if (blockedX || blockedZ) {
    if (stuck === false) {
      p.speed = applyDamping(p.speed, 1.5, dt);
    }
  }
  p.x = moved.x;
  p.z = moved.z;
  p.x = Math.max(-12, Math.min(290, p.x));
  p.z = Math.max(-12, Math.min(252, p.z));
}

function stepInCar(G, dt) {
  const p = G.player;
  const keys = G.keys;
  const v = p.vehicle;
  const input = {
    throttle: (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 0.7 : 0),
    steer: (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0),
    brake: Boolean(keys['Space']),
  };
  stepVehicle(v, input, dt, G.city.colliders, G.vehicles);
  p.x = v.x;
  p.z = v.z;
  p.yaw = v.yaw;
  p.speed = v.speed;
  if (G.audio) { G.audio.engine(v.speed, v.maxSpeed); }
}

function tryEnterExit(G) {
  const p = G.player;
  if (p.enterCooldown > 0) { return; }
  const wasOnFoot = p.onFoot;
  if (wasOnFoot) {
    const found = nearestVehicle(p, G.vehicles);
    if (found.vehicle) {
      const v = found.vehicle;
      p.onFoot = false;
      p.vehicle = v;
      v.parked = false;
      v.driver = 'player';
      p.enterCooldown = 0.6;
      p.speed = 0;
      if (G.audio) { G.audio.door(); }
      if (v.name === 'Comet GT') {
        G.events.push('stole-comet');
      }
    }
  }
  if (wasOnFoot === false) {
    const v = p.vehicle;
    const basis = yawBasis(v.yaw);
    p.x = v.x + basis.rgtX * 2.2;
    p.z = v.z + basis.rgtZ * 2.2;
    p.yaw = v.yaw;
    p.speed = 0;
    p.onFoot = true;
    p.vehicle = null;
    v.parked = true;
    v.driver = null;
    p.enterCooldown = 0.6;
  }
}

function nearestTarget(G, maxDist) {
  let best = null;
  let bestDist = maxDist;
  const px = G.player.x;
  const pz = G.player.z;
  const aimYaw = Math.atan2(-(G.player.aimX - px), -(G.player.aimZ - pz));
  const candidates = G.peds.concat(G.police.interceptors.map(function wrap(v) { return { x: v.x, z: v.z, kind: 'cop', ref: v }; }));
  for (const c of candidates) {
    const dx = c.x - px;
    const dz = c.z - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const ang = Math.atan2(-dx, -dz);
    let diff = ang - aimYaw;
    while (diff > Math.PI) { diff -= Math.PI * 2; }
    while (diff < -Math.PI) { diff += Math.PI * 2; }
    if (dist < bestDist) {
      if (Math.abs(diff) < 0.5) {
        bestDist = dist;
        best = c;
      }
    }
  }
  const found = { target: best, dist: bestDist };
  return found;
}

function firePistol(G) {
  const p = G.player;
  if (p.hasPistol === false) { return; }
  if (p.ammo <= 0) { return; }
  if (p.fireTimer > 0) { return; }
  if (p.reloadTimer > 0) { return; }
  p.ammo -= 1;
  p.fireTimer = 0.28;
  p.muzzle = 0.09;
  if (G.audio) { G.audio.shot(); }
  const found = nearestTarget(G, 15);
  if (found.target) {
    if (found.target.kind === 'cop') {
      found.target.ref.hitFlash = 0.4;
      found.target.speed *= 0.5;
    }
    if (found.target.kind === 'ped') {
      found.target.flee = 3;
      found.target.health -= 34;
    }
  }
  G.police.heat = Math.min(100, G.police.heat + 2);
}

function meleeSwing(G) {
  const p = G.player;
  if (p.meleeTimer > 0) { return; }
  p.meleeTimer = 0.45;
  if (G.audio) { G.audio.swing(); }
  const found = nearestTarget(G, 2.2);
  if (found.target) {
    if (found.target.kind === 'ped') {
      found.target.flee = 3;
      found.target.health -= 50;
    }
    if (found.target.kind === 'cop') {
      found.target.ref.hitFlash = 0.3;
    }
  }
}

function interactService(G) {
  const p = G.player;
  if (p.onFoot === false) { return; }
  const places = G.city.places;
  const keys = Object.keys(places);
  for (const key of keys) {
    const place = places[key];
    const dx = p.x - place.x;
    const dz = p.z - place.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 3.2) {
      if (key.indexOf('taco') === 0) {
        if (p.cash >= 5) {
          if (p.health < 100) {
            p.cash -= 5;
            p.health = 100;
            G.events.push('ate-taco');
          }
        }
      }
      if (key === 'gunshop') {
        if (p.hasPistol === false) {
          if (p.cash >= 80) {
            p.cash -= 80;
            p.hasPistol = true;
            p.ammo = 12;
            p.reserveAmmo = 24;
            G.events.push('bought-pistol');
          }
        }
        if (p.hasPistol) {
          if (p.cash >= 20) {
            if (p.reserveAmmo < 60) {
              p.cash -= 20;
              p.reserveAmmo += 24;
              G.events.push('bought-ammo');
            }
          }
        }
      }
      if (key === 'motel') {
        G.events.push('saved-motel');
      }
    }
  }
}

export function stepPlayer(G, dt) {
  const p = G.player;
  if (p.fireTimer > 0) { p.fireTimer -= dt; }
  if (p.reloadTimer > 0) { p.reloadTimer -= dt; }
  if (p.meleeTimer > 0) { p.meleeTimer -= dt; }
  if (p.enterCooldown > 0) { p.enterCooldown -= dt; }
  if (p.muzzle > 0) { p.muzzle -= dt; }
  if (p.hurtFlash > 0) { p.hurtFlash -= dt; }
  if (p.health < 100) {
    if (G.time - p.lastHurt > 6) {
      p.health = Math.min(100, p.health + 2 * dt);
    }
  }
  if (p.onFoot) {
    stepOnFoot(G, dt);
  }
  if (p.onFoot === false) {
    stepInCar(G, dt);
  }
  if (G.pressed.has('KeyF')) {
    tryEnterExit(G);
  }
  if (G.mouse.down) {
    if (p.onFoot) {
      firePistol(G);
    }
  }
  if (G.pressed.has('KeyR')) {
    if (p.hasPistol) {
      if (p.reloadTimer <= 0) {
        if (p.ammo < 12) {
          if (p.reserveAmmo > 0) {
            const need = 12 - p.ammo;
            const take = Math.min(need, p.reserveAmmo);
            p.ammo += take;
            p.reserveAmmo -= take;
            p.reloadTimer = 1.1;
            if (G.audio) { G.audio.reload(); }
          }
        }
      }
    }
  }
  if (G.pressed.has('Space')) {
    if (p.onFoot) {
      meleeSwing(G);
    }
  }
  if (G.pressed.has('KeyE')) {
    interactService(G);
  }
}

export function damagePlayer(G, amount) {
  const p = G.player;
  p.health -= amount;
  p.hurtFlash = 0.3;
  p.lastHurt = G.time;
  if (p.health <= 0) {
    p.health = 0;
    G.events.push('wasted');
  }
}

export function drawPlayer(ctx, p, cam, time) {
  if (p.onFoot === false) { return; }
  const scale = cam.scale;
  const ox = ctx.canvas.width / 2 - cam.x * scale;
  const oz = ctx.canvas.height / 2 - cam.z * scale;
  const sx = p.x * scale + ox;
  const sz = p.z * scale + oz;
  ctx.save();
  ctx.translate(sx, sz);
  ctx.fillStyle = 'rgba(15,6,15,0.5)';
  ctx.beginPath();
  ctx.ellipse(4, 5, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.yaw + Math.PI);
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#fff8e6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2c1654';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(6, -4);
  ctx.lineTo(-6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e4572e';
  ctx.fillRect(-7, 2, 14, 5);
  if (p.muzzle > 0) {
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(0, -22, 7 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (p.hurtFlash > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,45,85,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sz, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
