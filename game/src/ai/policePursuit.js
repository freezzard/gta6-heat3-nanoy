// SBPD pursuit — heat maps to 1-5 wanted stars, Interceptor cars chase,
// ram and pin the player, and an on-foot bust meter fills when a cop
// closes in. Heat decays while the player is unseen.

import { createVehicle, stepVehicle, yawBasis } from '../entities/vehiclePhysics.js';

export function wantedFromHeat(heat) {
  let wanted = 0;
  if (heat >= 15) { wanted = 1; }
  if (heat >= 35) { wanted = 2; }
  if (heat >= 55) { wanted = 3; }
  if (heat >= 75) { wanted = 4; }
  if (heat >= 92) { wanted = 5; }
  return wanted;
}

export function createPolice() {
  const police = {
    heat: 0,
    wanted: 0,
    bust: 0,
    interceptors: [],
    spawnTimer: 0,
  };
  return police;
}

export function addHeat(G, amount) {
  G.police.heat = Math.max(0, Math.min(100, G.police.heat + amount));
}

function spawnSpot(G, index) {
  const p = G.player;
  const angle = (index * 2.4) + 0.7;
  const dist = 34 + index * 4;
  const x = p.x + Math.cos(angle) * dist;
  const z = p.z + Math.sin(angle) * dist;
  const clampedX = Math.max(-10, Math.min(244, x));
  const clampedZ = Math.max(-10, Math.min(250, z));
  const spot = { x: clampedX, z: clampedZ };
  return spot;
}

function spawnInterceptor(G) {
  const index = G.police.interceptors.length;
  const spot = spawnSpot(G, index);
  const v = createVehicle({
    x: spot.x,
    z: spot.z,
    yaw: 0,
    kind: 'police',
    color: '#f1faee',
    name: 'INTERCEPTOR',
    parked: false,
    maxSpeed: 27,
  });
  v.driver = 'cop';
  G.police.interceptors.push(v);
  G.vehicles.push(v);
  if (G.audio) { G.audio.siren(true); }
}

function steerToward(v, tx, tz, dt) {
  const dx = tx - v.x;
  const dz = tz - v.z;
  const wantYaw = Math.atan2(-dx, -dz);
  let diff = wantYaw - v.yaw;
  while (diff > Math.PI) { diff -= Math.PI * 2; }
  while (diff < -Math.PI) { diff += Math.PI * 2; }
  const steer = Math.max(-1, Math.min(1, diff * 1.6));
  const input = { throttle: 1, steer, brake: false };
  return input;
}

function stepInterceptor(G, v, dt) {
  const p = G.player;
  const dx = p.x - v.x;
  const dz = p.z - v.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const input = steerToward(v, p.x, p.z, dt);
  if (dist < 4.5) {
    input.throttle = 1;
    v.maxSpeed = 29;
  }
  if (dist > 14) {
    v.maxSpeed = 27;
  }
  stepVehicle(v, input, dt, G.city.colliders, G.vehicles);
  if (dist < 2.6) {
    if (p.onFoot) {
      G.police.bust += dt * 0.55;
    }
    if (p.onFoot === false) {
      if (p.vehicle) {
        p.vehicle.speed *= 0.985;
      }
    }
  }
  if (dist < 1.9) {
    if (p.onFoot) {
      damagePlayer(G, 18 * dt);
    }
  }
}

function damagePlayer(G, amount) {
  const p = G.player;
  p.health -= amount;
  p.hurtFlash = 0.3;
  p.lastHurt = G.time;
  if (p.health <= 0) {
    p.health = 0;
    G.events.push('wasted');
  }
}

export function stepPolice(G, dt) {
  const police = G.police;
  police.wanted = wantedFromHeat(police.heat);
  police.spawnTimer -= dt;
  if (police.wanted > police.interceptors.length) {
    if (police.spawnTimer <= 0) {
      spawnInterceptor(G);
      police.spawnTimer = 1.4;
    }
  }
  let nearestCop = 999;
  for (const v of police.interceptors) {
    const dx = v.x - G.player.x;
    const dz = v.z - G.player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < nearestCop) { nearestCop = dist; }
  }
  if (nearestCop > 30) {
    police.heat = Math.max(0, police.heat - 3 * dt);
  }
  if (nearestCop <= 30) {
    police.heat = Math.max(0, police.heat - 0.4 * dt);
  }
  if (police.wanted === 0) {
    if (G.player.onFoot) {
      police.bust = Math.max(0, police.bust - 0.5 * dt);
    }
  }
  if (police.wanted > 0) {
    if (G.player.onFoot === false) {
      police.bust = Math.max(0, police.bust - 0.3 * dt);
    }
  }
  for (const v of police.interceptors) {
    stepInterceptor(G, v, dt);
  }
  if (police.bust >= 1) {
    police.bust = 0;
    G.events.push('busted');
  }
  const kept = [];
  for (const v of police.interceptors) {
    const dx = v.x - G.player.x;
    const dz = v.z - G.player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (police.wanted > 0) {
      kept.push(v);
    }
    if (police.wanted === 0) {
      if (dist < 55) {
        kept.push(v);
      }
    }
  }
  police.interceptors = kept;
  const keptVehicles = [];
  for (const v of G.vehicles) {
    if (v.driver === 'cop') {
      if (kept.indexOf(v) >= 0) {
        keptVehicles.push(v);
      }
    }
    if (v.driver !== 'cop') {
      keptVehicles.push(v);
    }
  }
  G.vehicles = keptVehicles;
  if (police.interceptors.length === 0) {
    if (G.audio) { G.audio.siren(false); }
  }
}

export function drawBustMeter(ctx, G) {
  const police = G.police;
  if (police.bust <= 0.02) { return; }
  const w = 260;
  const h = 22;
  const x = (ctx.canvas.width - w) / 2;
  const y = 96;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,22,0.9)';
  ctx.fillRect(x - 8, y - 8, w + 16, h + 30);
  ctx.fillStyle = '#ff2d55';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED?', ctx.canvas.width / 2, y + 4);
  ctx.fillStyle = '#2e2233';
  ctx.fillRect(x, y + 10, w, h);
  ctx.fillStyle = '#ff2d55';
  ctx.fillRect(x, y + 10, w * police.bust, h);
  ctx.restore();
}
