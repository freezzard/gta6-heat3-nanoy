// Art Deco buildings — golden-hour neon rendering for Solara Bay.
// Top-down roofs with a fake-height side face, stepped parapets, lit windows
// and emissive neon trim. Named places carry big glowing signs.

function hexToRgb(hexValue) {
  const r = (hexValue >> 16) & 255;
  const g = (hexValue >> 8) & 255;
  const b = hexValue & 255;
  const rgb = { r, g, b };
  return rgb;
}

function shade(hexValue, factor) {
  const rgb = hexToRgb(hexValue);
  const r = Math.max(0, Math.min(255, Math.round(rgb.r * factor)));
  const g = Math.max(0, Math.min(255, Math.round(rgb.g * factor)));
  const b = Math.max(0, Math.min(255, Math.round(rgb.b * factor)));
  const out = 'rgb(' + r + ',' + g + ',' + b + ')';
  return out;
}

function neonFor(hue, time) {
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.4 + hue * 0.001);
  const rgb = hexToRgb(hue);
  const out = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + pulse.toFixed(2) + ')';
  return out;
}

function drawRoofPattern(ctx, b, sx, sz, sw, sd, time) {
  const steps = b.style === 'stepped' ? 3 : 1;
  for (let s = 0; s < steps; s += 1) {
    const inset = s * 3;
    const insetZ = s * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx + inset, sz + insetZ, sw - inset * 2, sd - insetZ * 2);
  }
  if (b.style === 'tower') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(sx + sw * 0.32, sz + sd * 0.3, sw * 0.36, sd * 0.4);
    ctx.fillStyle = neonFor(b.hue, time);
    ctx.fillRect(sx + sw * 0.32, sz + sd * 0.3, sw * 0.36, 2);
  }
  if (b.style === 'crown') {
    ctx.fillStyle = neonFor(b.hue, time);
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.5, sz + 3);
    ctx.lineTo(sx + sw * 0.72, sz + sd * 0.42);
    ctx.lineTo(sx + sw * 0.28, sz + sd * 0.42);
    ctx.closePath();
    ctx.fill();
  }
  const winCols = Math.max(2, Math.floor(sw / 12));
  const winRows = Math.max(2, Math.floor(sd / 12));
  for (let c = 0; c < winCols; c += 1) {
    for (let r = 0; r < winRows; r += 1) {
      const lit = ((c * 7 + r * 13 + b.height) % 5) < 3;
      if (lit) {
        ctx.fillStyle = 'rgba(255,214,120,0.9)';
        ctx.fillRect(sx + 5 + c * 12, sz + 5 + r * 12, 6, 5);
      }
    }
  }
}

function drawBuilding(ctx, b, cam, time) {
  const scale = cam.scale;
  const ox = ctx.canvas.width / 2 - cam.x * scale;
  const oz = ctx.canvas.height / 2 - cam.z * scale;
  const sx = b.x * scale + ox;
  const sz = b.z * scale + oz;
  const sw = b.w * scale;
  const sd = b.d * scale;
  if (sx + sw < -40) { return; }
  if (sz + sd < -40) { return; }
  if (sx > ctx.canvas.width + 40) { return; }
  if (sz > ctx.canvas.height + 40) { return; }
  const lift = Math.min(26, 4 + b.height * 4);
  ctx.fillStyle = 'rgba(20,8,20,0.55)';
  ctx.fillRect(sx + 6, sz + lift + 4, sw, sd);
  ctx.fillStyle = shade(b.hue, 0.32);
  ctx.fillRect(sx, sz + lift, sw, sd);
  ctx.fillStyle = shade(b.hue, 0.62);
  ctx.fillRect(sx, sz, sw, sd);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx, sz, sw, sd);
  drawRoofPattern(ctx, b, sx, sz, sw, sd, time);
  ctx.save();
  ctx.shadowColor = neonFor(b.hue, time);
  ctx.shadowBlur = 14;
  ctx.strokeStyle = neonFor(b.hue, time);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(sx + 1, sz + 1, sw - 2, sd - 2);
  ctx.restore();
  if (b.named !== '') {
    drawNeonSign(ctx, b, sx, sz, sw, sd, time);
  }
}

export function drawNeonSign(ctx, b, sx, sz, sw, sd, time) {
  const cx = sx + sw / 2;
  const cy = sz + sd / 2;
  const fontPx = Math.max(15, Math.min(26, Math.floor(sw * 0.16)));
  ctx.save();
  ctx.font = 'bold ' + fontPx + 'px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = neonFor(b.hue, time);
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#fff8e6';
  ctx.fillText(b.named, cx, cy);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(10,14,22,0.85)';
  const tw = ctx.measureText(b.named).width;
  ctx.fillRect(cx - tw / 2 - 6, cy - fontPx * 0.5 - 4, tw + 12, fontPx + 8);
  ctx.fillStyle = neonFor(b.hue, time);
  ctx.fillText(b.named, cx, cy);
  ctx.restore();
}

export function drawBuildings(ctx, city, cam, time) {
  const sorted = city.buildings.slice().sort(function byDepth(a, b) { return a.z - b.z; });
  for (const b of sorted) {
    drawBuilding(ctx, b, cam, time);
  }
}

export function drawPalm(ctx, x, z, cam, time) {
  const scale = cam.scale;
  const ox = ctx.canvas.width / 2 - cam.x * scale;
  const oz = ctx.canvas.height / 2 - cam.z * scale;
  const sx = x * scale + ox;
  const sz = z * scale + oz;
  const sway = Math.sin(time * 1.2 + x) * 3;
  ctx.save();
  ctx.strokeStyle = '#5c3a21';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(sx, sz);
  ctx.lineTo(sx + sway, sz - 18);
  ctx.stroke();
  ctx.fillStyle = '#2fae5f';
  for (let f = 0; f < 6; f += 1) {
    const ang = (f / 6) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.ellipse(sx + sway + Math.cos(ang) * 10, sz - 18 + Math.sin(ang) * 6, 12, 4, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
