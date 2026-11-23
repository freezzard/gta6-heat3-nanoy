// Solara Heat — entry point. Assembles the city, the player, the police,
// street life and the mission chain, runs the fixed-clamp loop, renders
// the world top-down in golden hour, and exposes window.__DEBUG__ so an
// automated smoke test can read position, speed, yaw and state.

import { createCity, drawGround } from './world/leonidaCity.js';
import { drawBuildings } from './world/artDecoBuildings.js';
import { clampDt, createVehicle, drawVehicle } from './entities/vehiclePhysics.js';
import { createPlayer, stepPlayer, drawPlayer } from './entities/playerController.js';
import { createPolice, stepPolice } from './ai/policePursuit.js';
import { createStreetLife, stepStreetLife, drawStreetLife } from './ai/trafficAndPeds.js';
import { createMissions, stepMissions, startMission, drawMissionMarkers } from './missions/heistMissions.js';
import { applyScene } from './scenes.js';
import { drawHud, drawTitle, drawPause, drawHelp } from './ui/gtaHud.js';
import { createAudio, unlockAudio, engine, siren, shot, crash, door, swing, reload, passed, musicTick, toggleMute } from './audio/synthRadio.js';

const SAVE_KEY = 'solara-heat-save-v1';
const VIEW_W = 1280;
const VIEW_H = 800;
const AUDIO_FNS = { engine, siren, shot, crash, door, swing, reload, passed };

function readSave() {
  if (typeof window === 'undefined') { return null; }
  if (typeof window.localStorage === 'undefined') { return null; }
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (raw === null) { return null; }
  const parsed = JSON.parse(raw);
  return parsed;
}

function writeSave(data) {
  if (typeof window === 'undefined') { return; }
  if (typeof window.localStorage === 'undefined') { return; }
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function buildAudioApi(state) {
  const api = { state, tick: function tickWrap(dt) { musicTick(state, dt); }, unlock: function unlockWrap() { unlockAudio(state); }, mute: function muteWrap() { return toggleMute(state); } };
  for (const name of Object.keys(AUDIO_FNS)) {
    api[name] = function audioCall() { return AUDIO_FNS[name].apply(null, [state].concat(Array.prototype.slice.call(arguments))); };
  }
  return api;
}

function buildGame(canvas) {
  const city = createCity();
  const audio = buildAudioApi(createAudio());
  const player = createPlayer({ x: 120, z: 144, yaw: 0 });
  const vehicles = [];
  for (const def of city.parked) {
    vehicles.push(createVehicle(def));
  }
  const comet = createVehicle({ x: 116, z: 108, yaw: Math.PI / 2, kind: 'coupe', color: '#ffb703', name: 'Comet GT', parked: true, maxSpeed: 30 });
  vehicles.push(comet);
  const truck = createVehicle({ x: 199, z: 228, yaw: 0, kind: 'truck', color: '#8d99ae', name: 'Box Truck', parked: true, maxSpeed: 20 });
  vehicles.push(truck);
  const life = createStreetLife(city);
  for (const v of life.traffic) {
    vehicles.push(v);
  }
  const G = {
    canvas,
    ctx: canvas.getContext('2d'),
    city,
    player,
    vehicles,
    traffic: life.traffic,
    peds: life.peds,
    police: createPolice(),
    missions: createMissions(),
    audio,
    keys: {},
    pressed: new Set(),
    mouse: { x: VIEW_W / 2, y: VIEW_H / 2, down: false },
    events: [],
    time: 0,
    state: 'title',
    cam: { x: 120, z: 144, scale: 16 },
    saveExists: false,
    scene: '',
  };
  G.saveGame = function saveGame() {
    const data = { cash: G.player.cash, health: G.player.health, x: G.player.x, z: G.player.z, mission: G.missions.index, step: G.missions.step, hasPistol: G.player.hasPistol, ammo: G.player.ammo };
    writeSave(data);
    G.saveExists = true;
  };
  const saved = readSave();
  if (saved !== null) {
    G.saveExists = true;
    G.savedData = saved;
  }
  return G;
}

function applyContinue(G) {
  const s = G.savedData;
  if (s === undefined) { return; }
  G.player.cash = s.cash;
  G.player.health = s.health;
  G.player.x = s.x;
  G.player.z = s.z;
  G.player.hasPistol = s.hasPistol;
  G.player.ammo = s.ammo || 0;
  G.missions.index = s.mission || 0;
  G.missions.step = s.step || 0;
  G.cam.x = s.x;
  G.cam.z = s.z;
}

function installDebug(G) {
  window.__ERRORS__ = [];
  window.addEventListener('error', function onError(ev) {
    window.__ERRORS__.push(String(ev.message || ev.type));
  });
  window.__DEBUG__ = {
    snapshot: function snapshot() {
      const p = G.player;
      const snap = { x: Number(p.x.toFixed(3)), z: Number(p.z.toFixed(3)), speed: Number(Math.abs(p.speed).toFixed(3)), yaw: Number(p.yaw.toFixed(3)), state: G.state, wanted: G.police.wanted, mission: G.missions.index + 1, step: G.missions.step + 1, cash: Math.floor(p.cash), health: Math.floor(p.health), errors: window.__ERRORS__.length, scene: G.scene };
      return snap;
    },
    setPos: function setPos(x, z, yaw) {
      const p = G.player;
      if (p.vehicle) {
        p.vehicle.x = x;
        p.vehicle.z = z;
        p.vehicle.yaw = yaw;
        p.vehicle.speed = 0;
      }
      p.x = x;
      p.z = z;
      p.yaw = yaw;
      p.speed = 0;
      G.cam.x = x;
      G.cam.z = z;
    },
  };
}

function installInput(G) {
  window.addEventListener('keydown', function onKeyDown(ev) {
    const code = ev.code;
    if (code === 'Space' || code.indexOf('Arrow') === 0) {
      ev.preventDefault();
    }
    if (ev.repeat === false) {
      G.pressed.add(code);
    }
    G.keys[code] = true;
    G.audio.unlock();
    if (G.state === 'title') {
      if (code === 'Enter') {
        G.state = 'play';
        startMission(G, 0);
      }
      if (code === 'KeyC') {
        if (G.saveExists) {
          applyContinue(G);
          G.state = 'play';
        }
      }
    }
    if (code === 'KeyP') {
      const wasPlay = G.state === 'play';
      const wasPause = G.state === 'pause';
      if (wasPlay) { G.state = 'pause'; }
      if (wasPause) { G.state = 'play'; }
    }
    if (code === 'KeyH') {
      const wasPlay = G.state === 'play';
      const wasHelp = G.state === 'help';
      if (wasPlay) { G.state = 'help'; }
      if (wasHelp) { G.state = 'play'; }
    }
    if (code === 'Escape') {
      if (G.state === 'help') { G.state = 'play'; }
    }
    if (code === 'KeyM') {
      G.audio.mute();
    }
  });
  window.addEventListener('keyup', function onKeyUp(ev) {
    G.keys[ev.code] = false;
  });
  G.canvas.addEventListener('mousemove', function onMove(ev) {
    const rect = G.canvas.getBoundingClientRect();
    G.mouse.x = ev.clientX - rect.left;
    G.mouse.y = ev.clientY - rect.top;
    const scale = G.cam.scale;
    G.player.aimX = G.cam.x + (G.mouse.x - VIEW_W / 2) / scale;
    G.player.aimZ = G.cam.z + (G.mouse.y - VIEW_H / 2) / scale;
  });
  G.canvas.addEventListener('mousedown', function onDown() {
    G.mouse.down = true;
    G.audio.unlock();
    if (G.state === 'title') {
      G.state = 'play';
      startMission(G, 0);
    }
  });
  window.addEventListener('mouseup', function onUp() {
    G.mouse.down = false;
  });
}

function update(G, dt) {
  stepPlayer(G, dt);
  stepPolice(G, dt);
  stepStreetLife(G, dt);
  stepMissions(G, dt);
  G.audio.tick(dt);
  const k = Math.min(1, 8 * dt);
  G.cam.x += (G.player.x - G.cam.x) * k;
  G.cam.z += (G.player.z - G.cam.z) * k;
  G.pressed.clear();
}

function render(G) {
  const ctx = G.ctx;
  const cam = G.cam;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawGround(ctx, G.city, cam, G.time);
  drawBuildings(ctx, G.city, cam, G.time);
  drawMissionMarkers(ctx, G, cam, G.time);
  const sortedVehicles = G.vehicles.slice().sort(function byDepth(a, b) { return a.z - b.z; });
  for (const v of sortedVehicles) {
    drawVehicle(ctx, v, cam, G.time);
  }
  drawStreetLife(ctx, G, cam, G.time);
  drawPlayer(ctx, G.player, cam, G.time);
  if (G.state === 'title') {
    drawTitle(ctx, G);
    return;
  }
  drawHud(ctx, G);
  if (G.state === 'pause') {
    drawPause(ctx, G);
  }
  if (G.state === 'help') {
    drawHelp(ctx, G);
  }
}

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const G = buildGame(canvas);
  installInput(G);
  installDebug(G);
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene') || '';
  const autostart = params.get('autostart') === '1';
  if (scene !== '') {
    applyScene(G, scene);
  }
  if (autostart) {
    if (scene === '') {
      G.state = 'play';
      startMission(G, 0);
    }
  }
  let last = performance.now();
  const loop = function loop(now) {
    const rawDt = (now - last) / 1000;
    last = now;
    const dt = clampDt(rawDt);
    G.time += dt;
    if (G.state === 'play') {
      update(G, dt);
    }
    if (G.state === 'title') {
      G.cam.x = 120 + Math.sin(G.time * 0.05) * 20;
      G.cam.z = 120 + Math.cos(G.time * 0.04) * 16;
    }
    render(G);
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);
}

boot();
