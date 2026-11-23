// Solara Heat HUD — cash, wanted stars, health, objective panel, whole-city
// minimap, banners, dialogue, title / pause / help screens and the
// MISSION PASSED overlay. Main HUD type is 22-28px bold on dark plates.

import { drawBustMeter } from '../ai/policePursuit.js';
import { currentObjective } from '../missions/heistMissions.js';

function plate(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,14,22,0.90)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,209,102,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line === '' ? word : line + ' ' + word;
    if (ctx.measureText(trial).width > maxWidth) {
      if (line !== '') { lines.push(line); }
      line = word;
    }
    if (ctx.measureText(trial).width <= maxWidth) { line = trial; }
  }
  if (line !== '') { lines.push(line); }
  return lines;
}

function drawStars(ctx, G) {
  const wanted = G.police.wanted;
  const x = ctx.canvas.width - 260;
  const y = 18;
  plate(ctx, x, y, 244, 46);
  ctx.save();
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    const filled = i < wanted;
    ctx.fillStyle = filled ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.shadowColor = filled ? '#ffd166' : 'transparent';
    ctx.shadowBlur = filled ? 12 : 0;
    ctx.fillText('★', x + 14 + i * 44, y + 25);
  }
  ctx.restore();
}

function drawCashHealth(ctx, G) {
  const p = G.player;
  plate(ctx, 18, 18, 300, 46);
  ctx.save();
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#06d6a0';
  ctx.fillText('$' + Math.floor(p.cash), 32, 42);
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillStyle = '#fff8e6';
  ctx.fillText('RIO CALLAHAN', 170, 42);
  ctx.restore();
  plate(ctx, 18, 74, 300, 40);
  ctx.save();
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillStyle = '#fff8e6';
  ctx.textAlign = 'left';
  ctx.fillText('HEALTH', 30, 95);
  ctx.fillStyle = '#2e2233';
  ctx.fillRect(100, 84, 200, 20);
  ctx.fillStyle = p.health > 50 ? '#06d6a0' : '#ff5e62';
  ctx.fillRect(100, 84, 200 * (p.health / 100), 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.strokeRect(100, 84, 200, 20);
  ctx.restore();
  if (p.hasPistol) {
    plate(ctx, 18, 124, 300, 34);
    ctx.save();
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'left';
    ctx.fillText('PISTOL  ' + p.ammo + ' / ' + p.reserveAmmo + '   [R] reload', 30, 142);
    ctx.restore();
  }
}

function drawObjective(ctx, G) {
  const obj = currentObjective(G);
  const w = 330;
  const h = obj.timer > 0 ? 92 : 74;
  plate(ctx, 18, 168, w, h);
  ctx.save();
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'left';
  ctx.fillText(obj.title, 32, 190);
  ctx.font = '17px Arial, sans-serif';
  ctx.fillStyle = '#fff8e6';
  const wrapped = wrapText(ctx, obj.text, w - 28);
  for (let i = 0; i < wrapped.length; i += 1) {
    ctx.fillText(wrapped[i], 32, 214 + i * 20);
  }
  if (obj.timer > 0) {
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = obj.timer < 20 ? '#ff5e62' : '#06d6a0';
    ctx.fillText(Math.ceil(obj.timer) + 's', 32, 214 + wrapped.length * 20);
  }
  ctx.restore();
}

function drawMinimap(ctx, G) {
  const mw = 210;
  const mh = 185;
  const x = 18;
  const y = ctx.canvas.height - mh - 18;
  plate(ctx, x, y, mw, mh);
  const sx = (wx) => x + 6 + ((wx + 14) / 306) * (mw - 12);
  const sz = (wz) => y + 6 + ((wz + 14) / 268) * (mh - 12);
  ctx.save();
  ctx.fillStyle = '#2c1654';
  ctx.fillRect(x + 6, y + 6, mw - 12, mh - 12);
  ctx.fillStyle = '#e8b06a';
  ctx.fillRect(sx(246), y + 6, sx(268) - sx(246), mh - 12);
  ctx.fillStyle = '#c94b7c';
  ctx.fillRect(sx(268), y + 6, x + mw - 6 - sx(268), mh - 12);
  ctx.fillStyle = '#5c3547';
  ctx.fillRect(x + 6, y + 6, sx(246) - (x + 6), mh - 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 11; k += 1) {
    const line = k * 24;
    ctx.beginPath();
    ctx.moveTo(sx(line), y + 6);
    ctx.lineTo(sx(line), y + mh - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 6, sz(line));
    ctx.lineTo(x + mw - 6, sz(line));
    ctx.stroke();
  }
  const obj = currentObjective(G);
  if (obj.target) {
    const pulse = 4 + Math.sin(G.time * 4) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(sx(obj.target.x), sz(obj.target.z), pulse + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const v of G.police.interceptors) {
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.arc(sx(v.x), sz(v.z), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = G.player;
  ctx.save();
  ctx.translate(sx(p.x), sz(p.z));
  ctx.rotate(p.yaw + Math.PI);
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#fff8e6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = '#fff8e6';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARA BAY', x + 8, y - 6);
  ctx.restore();
}

function drawBanner(ctx, G) {
  const m = G.missions;
  if (m.bannerTimer <= 0) { return; }
  if (m.banner === '') { return; }
  ctx.save();
  ctx.font = 'bold 26px Arial, sans-serif';
  const tw = ctx.measureText(m.banner).width;
  const x = (ctx.canvas.width - tw) / 2 - 18;
  plate(ctx, x, 150, tw + 36, 48);
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(m.banner, ctx.canvas.width / 2, 175);
  ctx.restore();
}

function drawDialogue(ctx, G) {
  const m = G.missions;
  if (m.dialogueTimer <= 0) { return; }
  if (m.dialogue === null) { return; }
  const w = 760;
  const h = 86;
  const x = (ctx.canvas.width - w) / 2;
  const y = ctx.canvas.height - 118;
  plate(ctx, x, y, w, h);
  ctx.save();
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'left';
  ctx.fillText(m.dialogue.speaker, x + 18, y + 26);
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#fff8e6';
  const lines = wrapText(ctx, m.dialogue.text, w - 36);
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], x + 18, y + 54 + i * 22);
  }
  ctx.restore();
}

function drawPassedCard(ctx, G) {
  const m = G.missions;
  if (m.passedTimer <= 0) { return; }
  if (m.passedCard === null) { return; }
  const w = 640;
  const h = 190;
  const x = (ctx.canvas.width - w) / 2;
  const y = (ctx.canvas.height - h) / 2 - 40;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,22,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillText(m.passedCard.title, ctx.canvas.width / 2, y + 68);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText(m.passedCard.subtitle, ctx.canvas.width / 2, y + 108);
  ctx.fillStyle = '#06d6a0';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('+$' + m.passedCard.reward, ctx.canvas.width / 2, y + 152);
  ctx.restore();
}

export function drawHud(ctx, G) {
  drawCashHealth(ctx, G);
  drawStars(ctx, G);
  drawObjective(ctx, G);
  drawMinimap(ctx, G);
  drawBanner(ctx, G);
  drawDialogue(ctx, G);
  drawPassedCard(ctx, G);
  drawBustMeter(ctx, G);
  ctx.save();
  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,248,230,0.75)';
  ctx.textAlign = 'center';
  const hint = G.player.onFoot ? '[WASD] move  [F] steal car  [E] use  [Space] melee  [P] pause  [H] help' : '[WASD] drive  [F] exit car  [Space] brake  [P] pause  [H] help';
  ctx.fillText(hint, ctx.canvas.width / 2, ctx.canvas.height - 12);
  ctx.restore();
  if (G.player.hurtFlash > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,45,85,0.7)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, ctx.canvas.width - 10, ctx.canvas.height - 10);
    ctx.restore();
  }
}

export function drawTitle(ctx, G) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,8,32,0.72)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const cx = ctx.canvas.width / 2;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff5e62';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 92px Arial, sans-serif';
  ctx.fillText('SOLARA HEAT', cx, 250);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText('Open-World Crime in Leonida', cx, 300);
  ctx.font = '20px Arial, sans-serif';
  ctx.fillStyle = '#ffb36b';
  ctx.fillText('5-Star Police Pursuit  •  Heist Missions  •  Sunset Ocean Drive', cx, 340);
  const hasSave = G.saveExists === true;
  plate(ctx, cx - 260, 400, 520, 120);
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText('ENTER — NEW GAME', cx, 440);
  if (hasSave) {
    ctx.fillStyle = '#06d6a0';
    ctx.fillText('C — CONTINUE', cx, 480);
  }
  if (hasSave === false) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('No save yet — the motel saves your story', cx, 480);
  }
  ctx.fillStyle = 'rgba(255,248,230,0.8)';
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('WASD move / drive   F steal car   E use services   Space melee / brake   P pause   H help', cx, 580);
  ctx.restore();
}

export function drawPause(ctx, G) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,22,0.78)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.fillText('PAUSED', ctx.canvas.width / 2, 300);
  ctx.fillStyle = '#fff8e6';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('P — resume      H — help      M — mute', ctx.canvas.width / 2, 360);
  ctx.restore();
}

export function drawHelp(ctx, G) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,22,0.92)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.fillText('HOW TO PLAY', ctx.canvas.width / 2, 130);
  const lines = [
    'WASD — move on foot / drive (A/D steer, W gas, S brake)',
    'F — steal any car / get out (short cooldown after exit)',
    'Mouse click — fire pistol (when armed)   R — reload',
    'Space — melee on foot / handbrake in a car',
    'E — taco stand (heal $5), gun shop, motel (save)',
    'Stars — heat from crimes; hide to cool down',
    'On foot near a cop, the BUST meter fills — break line of sight',
    'Missions — follow the gold marker; M mute, P pause, H help',
  ];
  ctx.fillStyle = '#fff8e6';
  ctx.font = '21px Arial, sans-serif';
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], ctx.canvas.width / 2, 190 + i * 42);
  }
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('H or ESC — close help', ctx.canvas.width / 2, 560);
  ctx.restore();
}
