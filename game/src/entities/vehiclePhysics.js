// Vehicle physics — Neon yaw-basis movement, shared by cars and the player.
// Forward: fwdX = -sin(yaw), fwdZ = -cos(yaw). Right: rgtX = cos(yaw), rgtZ = -sin(yaw).
// dt is clamped 0.001..0.05. Acceleration 48, damping exp(-rate*dt) with a 0.02 cutoff.
// Collision is Circle-vs-AABB in two passes: axis-separated sliding, then
// depenetration along the nearest side. Wall contact damps speed with a
// dt-scaled rate so a slide along a wall keeps its speed.

export const MOVE = {
  accel: 48,
  maxFoot: 9.5,
  maxCar: 26,
  dampFoot: 10,
  dampCar: 2.6,
  cutoff: 0.02,
};

export function clampDt(rawDt) {
  const clamped = Math.max(0.001, Math.min(0.05, rawDt));
  return clamped;
}

export function yawBasis(yaw) {
  const basis = {
    fwdX: -Math.sin(yaw),
    fwdZ: -Math.cos(yaw),
    rgtX: Math.cos(yaw),
    rgtZ: -Math.sin(yaw),
  };
  return basis;
}

export function applyDamping(speed, rate, dt) {
  const factor = Math.exp(-rate * dt);
  const damped = speed * factor;
  const result = Math.abs(damped) < MOVE.cutoff ? 0 : damped;
  return result;
}

export function circleHitsAabb(x, z, radius, box) {
  const nearestX = Math.max(box.x, Math.min(x, box.x + box.w));
  const nearestZ = Math.max(box.z, Math.min(z, box.z + box.d));
  const dx = x - nearestX;
  const dz = z - nearestZ;
  const hit = dx * dx + dz * dz < radius * radius;
  return hit;
}

// Two-pass move: X axis first, then Z axis, so a diagonal push slides along
// a wall instead of stopping. A final depenetration pass pushes the circle
// out along the nearest side when it still overlaps.
export function moveWithCollision(pos, radius, dx, dz, colliders) {
  let nx = pos.x + dx;
  let nz = pos.z + dz;
  for (const box of colliders) {
    if (circleHitsAabb(nx, pos.z, radius, box)) {
      nx = pos.x;
    }
  }
  for (const box of colliders) {
    if (circleHitsAabb(nx, nz, radius, box)) {
      nz = pos.z;
    }
  }
  for (const box of colliders) {
    if (circleHitsAabb(nx, nz, radius, box)) {
      const left = nx - radius - box.x;
      const right = box.x + box.w + radius - nx;
      const top = nz - radius - box.z;
      const bottom = box.z + box.d + radius - nz;
      const minSide = Math.min(left, right, top, bottom);
      if (minSide === left) { nx = box.x - radius; }
      if (minSide === right) { nx = box.x + box.w + radius; }
      if (minSide === top) { nz = box.z - radius; }
      if (minSide === bottom) { nz = box.z + box.d + radius; }
    }
  }
  const moved = { x: nx, z: nz };
  return moved;
}

export function createVehicle(def) {
  const vehicle = {
    x: def.x,
    z: def.z,
    yaw: def.yaw || 0,
    speed: 0,
    kind: def.kind || 'sedan',
    color: def.color || '#e4572e',
    name: def.name || 'Sedan',
    parked: def.parked !== false,
    driver: def.driver || null,
    radius: def.kind === 'truck' ? 1.5 : 1.15,
    maxSpeed: def.maxSpeed || MOVE.maxCar,
    hitFlash: 0,
  };
  return vehicle;
}

export function stepVehicle(v, input, dt, colliders, others) {
  const steerRate = 2.4 * Math.max(0.25, Math.min(1, Math.abs(v.speed) / 8));
  const dirSign = v.speed >= 0 ? 1 : -1;
  v.yaw += input.steer * steerRate * dirSign * dt;
  const freshBasis = yawBasis(v.yaw);
  if (input.throttle !== 0) {
    v.speed += input.throttle * MOVE.accel * dt;
  }
  if (input.brake) {
    v.speed = applyDamping(v.speed, 6, dt);
  }
  if (input.throttle === 0) {
    v.speed = applyDamping(v.speed, MOVE.dampCar, dt);
  }
  const capped = Math.max(-v.maxSpeed * 0.4, Math.min(v.maxSpeed, v.speed));
  v.speed = capped;
  const dx = freshBasis.fwdX * v.speed * dt;
  const dz = freshBasis.fwdZ * v.speed * dt;
  const moved = moveWithCollision(v, v.radius, dx, dz, colliders);
  const blockedX = Math.abs(moved.x - (v.x + dx)) > 0.01;
  const blockedZ = Math.abs(moved.z - (v.z + dz)) > 0.01;
  const blocked = blockedX || blockedZ;
  const stuck = blockedX && blockedZ;
  if (blocked) {
    v.hitFlash = 0.25;
  }
  if (stuck) {
    v.speed = applyDamping(v.speed, 8, dt);
  }
  if (blocked) {
    if (stuck === false) {
      v.speed = applyDamping(v.speed, 1.2, dt);
    }
  }
  v.x = moved.x;
  v.z = moved.z;
  for (const other of others) {
    if (other !== v) {
      const ox = v.x - other.x;
      const oz = v.z - other.z;
      const distSq = ox * ox + oz * oz;
      const minDist = v.radius + other.radius;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.01;
        const push = (minDist - dist) / 2;
        const ux = ox / dist;
        const uz = oz / dist;
        v.x += ux * push;
        v.z += uz * push;
        other.x -= ux * push;
        other.z -= uz * push;
        v.speed *= 0.7;
        other.speed *= 0.7;
        v.hitFlash = 0.2;
        other.hitFlash = 0.2;
      }
    }
  }
  if (v.hitFlash > 0) { v.hitFlash -= dt; }
  return blocked;
}

export function drawVehicle(ctx, v, cam, time) {
  const scale = cam.scale;
  const ox = ctx.canvas.width / 2 - cam.x * scale;
  const oz = ctx.canvas.height / 2 - cam.z * scale;
  const sx = v.x * scale + ox;
  const sz = v.z * scale + oz;
  const len = (v.kind === 'truck' ? 4.6 : 3.6) * scale;
  const wid = (v.kind === 'truck' ? 2.0 : 1.8) * scale;
  ctx.save();
  ctx.translate(sx, sz);
  ctx.rotate(v.yaw + Math.PI);
  ctx.fillStyle = 'rgba(15,6,15,0.5)';
  ctx.fillRect(-len / 2 + 4, -wid / 2 + 5, len, wid);
  ctx.fillStyle = v.color;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,24,40,0.9)';
  const cabLen = len * 0.42;
  ctx.beginPath();
  ctx.roundRect(-cabLen / 2 - len * 0.05, -wid * 0.36, cabLen, wid * 0.72, 5);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 3, 2.5, 5);
  ctx.fillRect(len / 2 - 3, wid / 2 - 8, 2.5, 5);
  if (v.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.roundRect(-len / 2, -wid / 2, len, wid, 7);
    ctx.fill();
  }
  if (v.kind === 'police') {
    const blink = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2d55' : '#2d7dff';
    ctx.beginPath();
    ctx.arc(0, -wid * 0.28, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blink ? '#2d7dff' : '#ff2d55';
    ctx.beginPath();
    ctx.arc(0, wid * 0.28, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (v.name !== '') {
    ctx.save();
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,14,22,0.85)';
    const tw = ctx.measureText(v.name).width;
    ctx.fillRect(sx - tw / 2 - 5, sz - wid / 2 - 22, tw + 10, 17);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(v.name, sx, sz - wid / 2 - 9);
    ctx.restore();
  }
}
