// Screenshot scenes — four staged states for the contact sheet.
// Each scene sets up a real playable state (never a fake render): the
// cover drive, the on-foot dialogue, the 3-star chase and the heist
// finale with its MISSION PASSED card. Driven by ?scene= in the URL.

import { createVehicle } from './entities/vehiclePhysics.js';
import { setDialogue, setBanner } from './missions/heistMissions.js';

function placeChaseExtras(G, count) {
  const p = G.player;
  for (let i = 0; i < count; i += 1) {
    const v = createVehicle({
      x: p.x + (i - 1) * 7,
      z: p.z + 16 + i * 6,
      yaw: 0,
      kind: 'police',
      color: '#f1faee',
      name: 'INTERCEPTOR',
      parked: false,
      maxSpeed: 27,
    });
    v.driver = 'cop';
    v.speed = 12;
    G.police.interceptors.push(v);
    G.vehicles.push(v);
  }
  for (let i = 0; i < 3; i += 1) {
    const t = G.traffic[i];
    t.x = p.x - 14 + i * 12;
    t.z = p.z - 24 - i * 4;
  }
}

function seatInComet(G, x, z, yaw, speed) {
  const p = G.player;
  const comet = G.vehicles.find(function findComet(v) { return v.name === 'Comet GT'; });
  p.onFoot = false;
  p.vehicle = comet;
  comet.parked = false;
  comet.driver = 'player';
  comet.x = x;
  comet.z = z;
  comet.yaw = yaw;
  comet.speed = speed;
  p.x = x;
  p.z = z;
  p.yaw = yaw;
  p.speed = speed;
}

export function applyScene(G, name) {
  G.scene = name;
  G.state = 'play';
  const p = G.player;
  if (name === 'cover') {
    seatInComet(G, 238, 128, 0, 14);
    G.police.heat = 40;
    G.missions.index = 1;
    G.missions.step = 1;
    setDialogue(G, 'MARA (Corvidae)', 'The Comet GT is parked by the cafe. Borrow it. The SBPD will notice.', 99);
    setBanner(G, 'MISSION 2 — BORROWED WINGS', 99);
    G.cam.scale = 13;
    G.cam.x = 232;
    G.cam.z = 132;
    placeChaseExtras(G, 2);
  }
  if (name === 'foot') {
    p.x = 102;
    p.z = 140;
    p.yaw = -0.6;
    G.missions.index = 0;
    G.missions.step = 0;
    setDialogue(G, 'MARA (Corvidae)', 'Rio. One package, Docks to Cafe Brisa. $250, exact. Do not get cute.', 99);
    setBanner(G, 'MISSION 1 — FIRST RUN', 99);
    for (let i = 0; i < 5; i += 1) {
      const ped = G.peds[i];
      ped.x = 96 + i * 4;
      ped.z = 146 + (i % 2) * 5;
    }
    G.cam.x = 104;
    G.cam.z = 138;
  }
  if (name === 'chase') {
    seatInComet(G, 120, 120, 0, 20);
    G.police.heat = 62;
    G.missions.index = 2;
    G.missions.step = 1;
    G.missions.timer = 47;
    setDialogue(G, 'RIO', 'Three stars and ninety seconds. Drive like the debt depends on it.', 99);
    setBanner(G, 'WANTED — 3 STARS', 99);
    placeChaseExtras(G, 3);
    G.cam.x = 120;
    G.cam.z = 126;
  }
  if (name === 'heist') {
    p.x = 266;
    p.z = 132;
    p.yaw = -1.5708;
    p.cash = 1520;
    G.missions.index = 3;
    G.missions.step = 3;
    G.missions.drops = 3;
    G.missions.freeRoam = true;
    G.missions.done = true;
    G.missions.passedCard = { title: 'MISSION PASSED', subtitle: 'THE LONG NIGHT', reward: 900 };
    G.missions.passedTimer = 999;
    setDialogue(G, 'RIO', 'The debt is paid. Solara Bay is mine now. Free roam.', 99);
    G.cam.x = 262;
    G.cam.z = 132;
    G.cam.scale = 14;
  }
}
