// Solara Bay — coastal city model for Solara Heat.
// A seeded 11x11 street grid with a beach and marina on the east edge.
// All positions are world units (metres); rendering scale lives in main.js.

export const CITY = {
  pitch: 24,
  roadHalf: 3.5,
  gridN: 11,
  beachX: 246,
  oceanX: 268,
  minX: -14,
  maxX: 292,
  minZ: -14,
  maxZ: 254,
  seed: 1337,
};

export function mulberry32(seedValue) {
  let state = seedValue >>> 0;
  const next = function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const out = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return out;
  };
  return next;
}

function blockRect(i, j) {
  const pitch = CITY.pitch;
  const margin = CITY.roadHalf + 1.5;
  const x0 = i * pitch + margin;
  const z0 = j * pitch + margin;
  const x1 = (i + 1) * pitch - margin;
  const z1 = (j + 1) * pitch - margin;
  const rect = { x: x0, z: z0, w: x1 - x0, d: z1 - z0 };
  return rect;
}

function placeBuildings(city, rng) {
  const palette = [0xffb36b, 0xff8fa3, 0x7fd4ff, 0xc9a86a, 0x9be37e, 0xffd166];
  const styles = ['stepped', 'tower', 'flat', 'crown'];
  const made = [];
  for (let i = 0; i < 10; i += 1) {
    for (let j = 0; j < 10; j += 1) {
      const rect = blockRect(i, j);
      const reserved = city.reservedBlocks.has(i + ':' + j);
      if (reserved === false) {
        const count = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < count; k += 1) {
          const w = 5 + rng() * 5;
          const d = 5 + rng() * 5;
          const x = rect.x + 1 + rng() * Math.max(0.5, rect.w - w - 2);
          const z = rect.z + 1 + rng() * Math.max(0.5, rect.d - d - 2);
          const hue = palette[Math.floor(rng() * palette.length)];
          const style = styles[Math.floor(rng() * styles.length)];
          const height = 2 + Math.floor(rng() * 5);
          made.push({ x, z, w, d, hue, style, height, named: '' });
        }
      }
    }
  }
  return made;
}

function placeNamed(city) {
  const named = [
    { key: 'cafe', label: 'CAFE BRISA', x: 96, z: 120, w: 12, d: 9, hue: 0xffd166, style: 'crown', height: 3 },
    { key: 'motel', label: 'MOTEL SOLARA', x: 48, z: 48, w: 11, d: 8, hue: 0x7fd4ff, style: 'flat', height: 2 },
    { key: 'gunshop', label: 'GUN SHOP', x: 132, z: 72, w: 9, d: 7, hue: 0xff8fa3, style: 'stepped', height: 2 },
    { key: 'taco1', label: 'TACOS', x: 72, z: 156, w: 6, d: 5, hue: 0x9be37e, style: 'flat', height: 1 },
    { key: 'taco2', label: 'TACOS', x: 180, z: 96, w: 6, d: 5, hue: 0x9be37e, style: 'flat', height: 1 },
    { key: 'taco3', label: 'TACOS', x: 144, z: 204, w: 6, d: 5, hue: 0x9be37e, style: 'flat', height: 1 },
    { key: 'chopshop', label: 'CHOP SHOP', x: 216, z: 144, w: 12, d: 8, hue: 0xc9a86a, style: 'stepped', height: 2 },
    { key: 'police', label: 'SBPD HQ', x: 96, z: 204, w: 13, d: 9, hue: 0x7fb4ff, style: 'tower', height: 5 },
    { key: 'hospital', label: 'HOSPITAL', x: 48, z: 180, w: 12, d: 9, hue: 0xffffff, style: 'flat', height: 3 },
    { key: 'docks', label: 'DOCKS', x: 228, z: 36, w: 14, d: 8, hue: 0xc9a86a, style: 'flat', height: 2 },
    { key: 'warehouse', label: 'WAREHOUSE', x: 192, z: 216, w: 14, d: 9, hue: 0xffb36b, style: 'flat', height: 2 },
  ];
  const out = [];
  for (const item of named) {
    const entry = { x: item.x, z: item.z, w: item.w, d: item.d, hue: item.hue, style: item.style, height: item.height, named: item.label, key: item.key };
    out.push(entry);
  }
  return out;
}

export function createCity() {
  const rng = mulberry32(CITY.seed);
  const reservedBlocks = new Set(['4:5', '2:2', '5:3', '3:6', '7:4', '6:8', '9:6', '4:8', '2:7', '9:1', '8:9']);
  const city = {
    reservedBlocks,
    buildings: [],
    places: {},
    parked: [],
    colliders: [],
  };
  const named = placeNamed(city);
  const filler = placeBuildings(city, rng);
  city.buildings = named.concat(filler);
  for (const b of city.buildings) {
    city.colliders.push({ x: b.x, z: b.z, w: b.w, d: b.d });
  }
  city.places = {
    cafe: { x: 102, z: 132, label: 'Cafe Brisa' },
    motel: { x: 53, z: 60, label: 'Motel Solara' },
    gunshop: { x: 136, z: 82, label: 'Gun Shop' },
    taco1: { x: 75, z: 164, label: 'Taco Stand' },
    taco2: { x: 183, z: 104, label: 'Taco Stand' },
    taco3: { x: 147, z: 212, label: 'Taco Stand' },
    chopshop: { x: 222, z: 156, label: 'Chop Shop' },
    police: { x: 102, z: 216, label: 'SBPD HQ' },
    hospital: { x: 54, z: 192, label: 'Hospital' },
    docks: { x: 235, z: 48, label: 'Docks' },
    warehouse: { x: 199, z: 228, label: 'Warehouse' },
    marina: { x: 272, z: 132, label: 'Marina' },
    beach: { x: 258, z: 180, label: 'Solara Beach' },
  };
  const parkedDefs = [
    { x: 108, z: 96, yaw: 0, kind: 'sedan', color: '#e4572e' },
    { x: 84, z: 120, yaw: 1.5708, kind: 'sedan', color: '#3a86ff' },
    { x: 132, z: 144, yaw: 0, kind: 'coupe', color: '#8338ec' },
    { x: 156, z: 72, yaw: 1.5708, kind: 'truck', color: '#6c757d' },
    { x: 180, z: 180, yaw: 0, kind: 'sedan', color: '#06d6a0' },
    { x: 60, z: 108, yaw: 1.5708, kind: 'coupe', color: '#ef476f' },
    { x: 204, z: 96, yaw: 0, kind: 'sedan', color: '#ffd166' },
    { x: 120, z: 204, yaw: 1.5708, kind: 'truck', color: '#8d99ae' },
  ];
  city.parked = parkedDefs;
  return city;
}

export function clampToCity(x, z) {
  const cx = Math.max(CITY.minX + 1, Math.min(CITY.maxX - 1, x));
  const cz = Math.max(CITY.minZ + 1, Math.min(CITY.maxZ - 1, z));
  const clamped = { x: cx, z: cz };
  return clamped;
}

export function drawGround(ctx, city, cam, time) {
  const scale = cam.scale;
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const ox = viewW / 2 - cam.x * scale;
  const oz = viewH / 2 - cam.z * scale;
  const sky = ctx.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, '#ff5e62');
  sky.addColorStop(0.45, '#ff9966');
  sky.addColorStop(1, '#2c1654');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);
  const ground = ctx.createLinearGradient(0, 0, viewW, viewH);
  ground.addColorStop(0, '#4a2b3a');
  ground.addColorStop(0.5, '#5c3547');
  ground.addColorStop(1, '#3a2140');
  ctx.fillStyle = ground;
  const gx0 = (CITY.minX - 4) * scale + ox;
  const gz0 = (CITY.minZ - 4) * scale + oz;
  const gw = (CITY.maxX - CITY.minX + 8) * scale;
  const gd = (CITY.maxZ - CITY.minZ + 8) * scale;
  ctx.fillRect(gx0, gz0, gw, gd);
  const ocean = ctx.createLinearGradient(CITY.oceanX * scale + ox, 0, viewW, 0);
  ocean.addColorStop(0, '#ff7e5f');
  ocean.addColorStop(0.5, '#c94b7c');
  ocean.addColorStop(1, '#2c1654');
  ctx.fillStyle = ocean;
  ctx.fillRect(CITY.oceanX * scale + ox, gz0, viewW - (CITY.oceanX * scale + ox), gd);
  ctx.fillStyle = '#e8b06a';
  ctx.fillRect(CITY.beachX * scale + ox, gz0, (CITY.oceanX - CITY.beachX) * scale, gd);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  const wave = Math.sin(time * 0.8) * 4;
  ctx.fillRect(CITY.oceanX * scale + ox + wave, gz0, 3, gd);
  ctx.fillStyle = '#8a6a4a';
  const pierX = 264;
  ctx.fillRect(pierX * scale + ox, 120 * scale + oz, 26 * scale, 3 * scale);
  ctx.fillStyle = '#6e5238';
  for (let p = 0; p < 13; p += 1) {
    ctx.fillRect((264 + p * 2) * scale + ox, 120 * scale + oz, 1.2 * scale, 3 * scale);
  }
  for (let k = 0; k < CITY.gridN; k += 1) {
    const line = k * CITY.pitch;
    ctx.fillStyle = '#2e2233';
    ctx.fillRect(line * scale + ox - CITY.roadHalf * scale, gz0, CITY.roadHalf * 2 * scale, gd);
    ctx.fillRect(gx0, line * scale + oz - CITY.roadHalf * scale, gw, CITY.roadHalf * 2 * scale);
    ctx.fillStyle = '#ffd166';
    for (let d = 0; d < 240; d += 12) {
      ctx.fillRect((line - 0.4) * scale + ox, (d + 2) * scale + oz, 0.8 * scale, 4 * scale);
      ctx.fillRect((d + 2) * scale + ox, (line - 0.4) * scale + oz, 4 * scale, 0.8 * scale);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 10; i += 1) {
    for (let j = 0; j < 10; j += 1) {
      const rect = blockRect(i, j);
      ctx.fillRect(rect.x * scale + ox, rect.z * scale + oz, rect.w * scale, rect.d * scale);
    }
  }
}
