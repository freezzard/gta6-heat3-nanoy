// Solara Bay street life — traffic cars looping the avenues and pedestrians
// strolling the sidewalks. Traffic follows the street grid; peds wander,
// scatter from gunfire and freeze when a car bears down on them.

import { createVehicle, stepVehicle } from '../entities/vehiclePhysics.js';
import { mulberry32 } from '../world/leonidaCity.js';

const TRAFFIC_COLORS = ['#3a86ff', '#e4572e', '#06d6a0', '#8338ec', '#ef476f', '#ffd166', '#8d99ae', '#f8ad9d'];

export function createStreetLife(city) {
  const rng = mulberry32(4242);
  const traffic = [];
  for (let i = 0; i < 10; i += 1) {
    const vertical = i % 2 === 0;
    const street = Math.floor(rng() * 11) * 24;
    const along = rng() * 240;
    const dir = rng() < 0.5 ? 1 : -1;
    const color = TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
    const v = createVehicle({
      x: vertical ? street + (dir > 0 ? 1.8 : -1.8) : along,
      z: vertical ? along : street + (dir > 0 ? 1.8 : -1.8),
      yaw: vertical ? (dir > 0 ? Math.PI : 0) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      kind: 'sedan',
      color,
      name: '',
      parked: false,
      maxSpeed: 11 + rng() * 3,
    });
    v.driver = 'traffic';
    v.street = street;
    v.vertical = vertical;
    v.dir = dir;
    v.cruise = v.maxSpeed;
    traffic.push(v);
  }
  const peds = [];
  for (let i = 0; i < 16; i += 1) {
    const x = 8 + rng() * 228;
    const z = 8 + rng() * 228;
    const ped = {
      x, z,
      yaw: rng() * Math.PI * 2,
      speed: 1.2 + rng() * 1.4,
      health: 100,
      flee: 0,
      shirt: TRAFFIC_COLORS[Math.floor(rng() * TRAFFIC_COLORS.length)],
      wander: 2 + rng() * 4,
      radius: 0.55,
    };
    peds.push(ped);
  }
  const life = { traffic, peds };
  return life;
}

function stepTrafficCar(G, v, dt) {
  const p = G.player;
  const dx = p.x - v.x;
  const dz = p.z - v.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  let throttle = 1;
  if (dist < 6) {
    if (p.onFoot) {
      throttle = 0.2;
    }
  }
  for (const other of G.vehicles) {
    if (other !== v) {
      const ox = other.x - v.x;
      const oz = other.z - v.z;
      const od = Math.sqrt(ox * ox + oz * oz);
      if (od < 7) {
        const ahead = v.vertical ? (Math.sign(oz) === v.dir) : (Math.sign(ox) === v.dir);
        if (ahead) {
          throttle = 0;
        }
      }
    }
  }
  const steer = 0;
  stepVehicle(v, { throttle, steer, brake: throttle === 0 }, dt, G.city.colliders, G.vehicles);
  const along = v.vertical ? v.z : v.x;
  if (along > 244 || along < -6) {
    if (v.vertical) {
      v.z = v.dir > 0 ? -6 : 244;
    }
    if (v.vertical === false) {
      v.x = v.dir > 0 ? -6 : 244;
    }
  }
  v.maxSpeed = v.cruise;
}

function stepPed(G, ped, dt) {
  ped.wander -= dt;
  if (ped.wander <= 0) {
    ped.yaw += (Math.random() - 0.5) * 2.4;
    ped.wander = 2 + Math.random() * 4;
  }
  const p = G.player;
  const dx = ped.x - p.x;
  const dz = ped.z - p.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (ped.flee > 0) {
    ped.flee -= dt;
    ped.yaw = Math.atan2(-dx, -dz);
  }
  if (dist < 3) {
    if (p.onFoot === false) {
      if (Math.abs(p.speed) > 3) {
        ped.yaw = Math.atan2(-dx, -dz);
        ped.flee = 1.2;
      }
    }
  }
  const speed = ped.flee > 0 ? 5.2 : ped.speed;
  const mx = -Math.sin(ped.yaw) * speed * dt;
  const mz = -Math.cos(ped.yaw) * speed * dt;
  ped.x = Math.max(-10, Math.min(244, ped.x + mx));
  ped.z = Math.max(-10, Math.min(250, ped.z + mz));
}

export function stepStreetLife(G, dt) {
  for (const v of G.traffic) {
    stepTrafficCar(G, v, dt);
  }
  for (const ped of G.peds) {
    stepPed(G, ped, dt);
  }
  const alive = [];
  for (const ped of G.peds) {
    if (ped.health > 0) {
      alive.push(ped);
    }
  }
  G.peds = alive;
}

export function drawStreetLife(ctx, G, cam, time) {
  const scale = cam.scale;
  const ox = ctx.canvas.width / 2 - cam.x * scale;
  const oz = ctx.canvas.height / 2 - cam.z * scale;
  for (const ped of G.peds) {
    const sx = ped.x * scale + ox;
    const sz = ped.z * scale + oz;
    const onScreen = sx >= -30 && sz >= -30 && sx <= ctx.canvas.width + 30 && sz <= ctx.canvas.height + 30;
    if (onScreen) {
      ctx.save();
      ctx.translate(sx, sz);
      ctx.fillStyle = 'rgba(15,6,15,0.5)';
      ctx.beginPath();
      ctx.ellipse(3, 4, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(ped.yaw + Math.PI);
      ctx.fillStyle = ped.shirt;
      ctx.strokeStyle = '#fff8e6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2c1654';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(4.5, -3);
      ctx.lineTo(-4.5, -3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
