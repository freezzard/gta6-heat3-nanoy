// The Long Night — four chained story missions for Rio Callahan.
// M1 First Run (courier, pays exactly $250), M2 Borrowed Wings (steal the
// Comet GT, scripted heat spike, pistol), M3 Harbor Freight (timed box-truck
// haul, 3-star wanted on pickup), M4 The Long Night (3 cash drops, boat
// escape at the marina, story-end card, then free roam).

const DROP_SPOTS = [
  { x: 60, z: 132, label: 'Cash Drop 1' },
  { x: 180, z: 36, label: 'Cash Drop 2' },
  { x: 228, z: 204, label: 'Cash Drop 3' },
];

function missionSteps() {
  const steps = [
    [
      { text: 'Pick up the package at the Docks', target: { x: 235, z: 48, label: 'Docks' }, radius: 3.5 },
      { text: 'Deliver the package to Cafe Brisa', target: { x: 102, z: 132, label: 'Cafe Brisa' }, radius: 3.5 },
    ],
    [
      { text: 'Steal the Comet GT parked by Cafe Brisa', target: { x: 116, z: 108, label: 'Comet GT' }, radius: 3.5 },
      { text: 'Drive the Comet GT back to Cafe Brisa', target: { x: 102, z: 132, label: 'Cafe Brisa' }, radius: 4 },
    ],
    [
      { text: 'Pick up the box truck at the Warehouse', target: { x: 199, z: 228, label: 'Warehouse' }, radius: 4 },
      { text: 'Haul the freight to the Docks — 90 seconds', target: { x: 235, z: 48, label: 'Docks' }, radius: 4 },
    ],
    [
      { text: 'Collect cash drop 1 of 3', target: DROP_SPOTS[0], radius: 3 },
      { text: 'Collect cash drop 2 of 3', target: DROP_SPOTS[1], radius: 3 },
      { text: 'Collect cash drop 3 of 3', target: DROP_SPOTS[2], radius: 3 },
      { text: 'Escape by boat at the Marina', target: { x: 272, z: 132, label: 'Marina Boat' }, radius: 4 },
    ],
  ];
  return steps;
}

const MISSION_TITLES = ['FIRST RUN', 'BORROWED WINGS', 'HARBOR FREIGHT', 'THE LONG NIGHT'];
const MISSION_PAY = [250, 150, 400, 900];

const INTRO_LINES = [
  { speaker: 'MARA (Corvidae)', text: 'Rio. One package, Docks to Cafe Brisa. $250, exact. Do not get cute.' },
  { speaker: 'MARA (Corvidae)', text: 'The Comet GT is parked by the cafe. Borrow it. The SBPD will notice.' },
  { speaker: 'MARA (Corvidae)', text: 'Box truck at the Warehouse. Ninety seconds to the Docks. Three stars the moment you touch it.' },
  { speaker: 'MARA (Corvidae)', text: 'Three drops, then the boat at the Marina. Tonight we settle the debt.' },
];

const DONE_LINES = [
  { speaker: 'RIO', text: 'Delivered. $250, exact. The debt just got lighter.' },
  { speaker: 'RIO', text: 'Comet GT, sweet as sin. And a pistol, finally.' },
  { speaker: 'RIO', text: 'Freight delivered with seconds to spare. The heat was worth it.' },
  { speaker: 'RIO', text: 'The debt is paid. Solara Bay is mine now. Free roam.' },
];

export function createMissions() {
  const missions = {
    index: 0,
    step: 0,
    steps: missionSteps(),
    timer: 0,
    drops: 0,
    done: false,
    freeRoam: false,
    banner: '',
    bannerTimer: 0,
    dialogue: null,
    dialogueTimer: 0,
    passedCard: null,
    passedTimer: 0,
    failedTimer: 0,
  };
  return missions;
}

export function currentObjective(G) {
  const m = G.missions;
  if (m.freeRoam) {
    const free = { title: 'FREE ROAM', text: 'Solara Bay is yours. Explore, steal, survive.', target: null, timer: 0 };
    return free;
  }
  const stepDef = m.steps[m.index][m.step];
  const objective = {
    title: 'MISSION ' + (m.index + 1) + ' — ' + MISSION_TITLES[m.index],
    text: stepDef.text,
    target: stepDef.target,
    timer: m.timer,
  };
  return objective;
}

export function setDialogue(G, speaker, text, seconds) {
  G.missions.dialogue = { speaker, text };
  G.missions.dialogueTimer = seconds;
}

export function setBanner(G, text, seconds) {
  G.missions.banner = text;
  G.missions.bannerTimer = seconds;
}

export function startMission(G, index) {
  const m = G.missions;
  m.index = index;
  m.step = 0;
  m.timer = 0;
  const line = INTRO_LINES[index];
  setDialogue(G, line.speaker, line.text, 5);
  setBanner(G, 'MISSION ' + (index + 1) + ' — ' + MISSION_TITLES[index], 3.5);
}

function completeMission(G) {
  const m = G.missions;
  const pay = MISSION_PAY[m.index];
  G.player.cash += pay;
  const line = DONE_LINES[m.index];
  setDialogue(G, line.speaker, line.text, 5);
  m.passedCard = { title: 'MISSION PASSED', subtitle: MISSION_TITLES[m.index], reward: pay };
  m.passedTimer = 4;
  if (G.audio) { G.audio.passed(); }
  if (m.index === 3) {
    m.freeRoam = true;
    m.done = true;
    return;
  }
  startMission(G, m.index + 1);
}

function advanceStep(G) {
  const m = G.missions;
  m.step += 1;
  if (m.step >= m.steps[m.index].length) {
    completeMission(G);
  }
}

function handleEvents(G) {
  const m = G.missions;
  const events = G.events.slice();
  G.events.length = 0;
  for (const ev of events) {
    if (ev === 'stole-comet') {
      if (m.index === 1) {
        if (m.step === 0) {
          G.police.heat = Math.max(G.police.heat, 40);
          G.player.hasPistol = true;
          G.player.ammo = 12;
          G.player.reserveAmmo = 24;
          setDialogue(G, 'RIO', 'Heat spike — SBPD is on me. But the Comet is mine.', 4);
          setBanner(G, 'WANTED — 2 STARS', 3);
          advanceStep(G);
        }
      }
    }
    if (ev === 'wasted') {
      G.player.health = 100;
      G.player.x = G.city.places.hospital.x;
      G.player.z = G.city.places.hospital.z + 6;
      G.player.cash = Math.max(0, G.player.cash - 150);
      G.police.heat = 0;
      setBanner(G, 'WASTED — patched up at the Hospital (-$150)', 4);
    }
    if (ev === 'busted') {
      G.player.cash = Math.max(0, G.player.cash - 100);
      G.police.heat = 0;
      setBanner(G, 'BUSTED — SBPD took $100', 4);
    }
    if (ev === 'saved-motel') {
      if (G.saveGame) { G.saveGame(); }
      setBanner(G, 'GAME SAVED — Motel Solara', 2.5);
    }
    if (ev === 'ate-taco') {
      setBanner(G, 'TACOS — health restored (-$5)', 2);
    }
    if (ev === 'bought-pistol') {
      setBanner(G, 'PISTOL BOUGHT — $80', 2.5);
    }
    if (ev === 'bought-ammo') {
      setBanner(G, 'AMMO BOUGHT — $20', 2);
    }
  }
}

export function stepMissions(G, dt) {
  const m = G.missions;
  if (m.bannerTimer > 0) { m.bannerTimer -= dt; }
  if (m.dialogueTimer > 0) { m.dialogueTimer -= dt; }
  if (m.passedTimer > 0) { m.passedTimer -= dt; }
  handleEvents(G);
  if (m.freeRoam) { return; }
  if (m.passedTimer > 0) { return; }
  if (m.index === 2) {
    if (m.step === 1) {
      if (m.timer > 0) {
        m.timer -= dt;
        if (m.timer <= 0) {
          m.timer = 0;
          m.step = 0;
          setDialogue(G, 'MARA (Corvidae)', 'Too slow. The truck is back at the Warehouse. Again.', 4);
          setBanner(G, 'MISSION FAILED — out of time', 3);
        }
      }
    }
  }
  const stepDef = m.steps[m.index][m.step];
  const p = G.player;
  const dx = p.x - stepDef.target.x;
  const dz = p.z - stepDef.target.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < stepDef.radius) {
    const needsCar = m.index === 2 && m.step === 0;
    const waitForSteal = m.index === 1 && m.step === 0;
    const arrived = needsCar ? p.onFoot === false : true;
    if (arrived) {
      if (waitForSteal === false) {
        if (m.index === 2) {
          if (m.step === 0) {
            G.police.heat = Math.max(G.police.heat, 60);
            m.timer = 90;
            setBanner(G, 'WANTED — 3 STARS', 3);
            setDialogue(G, 'RIO', 'Three stars and ninety seconds. Drive like the debt depends on it.', 4);
          }
        }
        if (m.index === 3) {
          m.drops += 1;
          G.player.cash += 50;
        }
        advanceStep(G);
      }
    }
  }
}

export function drawMissionMarkers(ctx, G, cam, time) {
  const m = G.missions;
  const scale = cam.scale;
  const ox = ctx.canvas.width / 2 - cam.x * scale;
  const oz = ctx.canvas.height / 2 - cam.z * scale;
  const drawHalo = function haloAt(tx, tz, label, color) {
    const sx = tx * scale + ox;
    const sz = tz * scale + oz;
    const pulse = 60 + Math.sin(time * 3) * 12;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(sx, sz, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sz, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(10,14,22,0.9)';
    ctx.fillRect(sx - tw / 2 - 7, sz - pulse - 30, tw + 14, 22);
    ctx.fillStyle = '#fff8e6';
    ctx.fillText(label, sx, sz - pulse - 14);
    ctx.restore();
  };
  if (m.freeRoam === false) {
    const stepDef = m.steps[m.index][m.step];
    drawHalo(stepDef.target.x, stepDef.target.z, stepDef.target.label, '#ffd166');
  }
  if (m.index === 3) {
    for (let i = m.drops; i < DROP_SPOTS.length; i += 1) {
      const spot = DROP_SPOTS[i];
      drawHalo(spot.x, spot.z, spot.label, '#06d6a0');
    }
  }
  const bx = 272 * scale + ox;
  const bz = 132 * scale + oz;
  ctx.save();
  ctx.translate(bx, bz);
  ctx.fillStyle = '#f1faee';
  ctx.strokeStyle = '#2c1654';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-34, -8);
  ctx.lineTo(30, -8);
  ctx.lineTo(40, 8);
  ctx.lineTo(-26, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff5e62';
  ctx.fillRect(-6, -26, 14, 18);
  ctx.restore();
}
