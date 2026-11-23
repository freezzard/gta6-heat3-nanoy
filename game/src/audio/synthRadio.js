// Synth radio — all audio is synthesized with WebAudio, no audio files.
// Engine hum follows speed, a two-tone siren loops while wanted, and
// gunshots, crashes, doors, reloads and the mission-passed sting are
// short synthesized bursts. Everything is guarded by a ready flag so a
// headless run without audio simply stays silent.

export function createAudio() {
  const audio = {
    ctx: null,
    ready: false,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenOn: false,
    musicTimer: 0,
    musicStep: 0,
  };
  return audio;
}

function ensureContext(audio) {
  if (audio.ready) { return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC === undefined) { return false; }
  if (audio.ctx === null) {
    audio.ctx = new AC();
  }
  if (audio.ctx.state === 'suspended') {
    audio.ctx.resume();
  }
  audio.ready = audio.ctx.state === 'running';
  if (audio.ready) {
    startEngine(audio);
  }
  return audio.ready;
}

function startEngine(audio) {
  const ctx = audio.ctx;
  audio.engineOsc = ctx.createOscillator();
  audio.engineOsc.type = 'sawtooth';
  audio.engineOsc.frequency.value = 55;
  audio.engineGain = ctx.createGain();
  audio.engineGain.gain.value = 0.0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  audio.engineOsc.connect(filter);
  filter.connect(audio.engineGain);
  audio.engineGain.connect(ctx.destination);
  audio.engineOsc.start();
  audio.sirenOsc = ctx.createOscillator();
  audio.sirenOsc.type = 'square';
  audio.sirenOsc.frequency.value = 700;
  audio.sirenGain = ctx.createGain();
  audio.sirenGain.gain.value = 0.0;
  audio.sirenOsc.connect(audio.sirenGain);
  audio.sirenGain.connect(ctx.destination);
  audio.sirenOsc.start();
}

export function unlockAudio(audio) {
  ensureContext(audio);
}

export function engine(audio, speed, maxSpeed) {
  if (ensureContext(audio) === false) { return; }
  if (audio.muted) {
    audio.engineGain.gain.value = 0;
    return;
  }
  const ratio = Math.abs(speed) / maxSpeed;
  audio.engineOsc.frequency.value = 55 + ratio * 165;
  audio.engineGain.gain.value = 0.03 + ratio * 0.05;
}

export function siren(audio, on) {
  if (audio.sirenOn === on) { return; }
  audio.sirenOn = on;
  if (ensureContext(audio) === false) { return; }
  audio.sirenGain.gain.value = on ? 0.035 : 0.0;
}

function burst(audio, freq, dur, vol, type) {
  if (ensureContext(audio) === false) { return; }
  if (audio.muted) { return; }
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

function noiseBurst(audio, dur, vol) {
  if (ensureContext(audio) === false) { return; }
  if (audio.muted) { return; }
  const ctx = audio.ctx;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function shot(audio) { noiseBurst(audio, 0.14, 0.4); burst(audio, 180, 0.1, 0.25, 'square'); }
export function crash(audio) { noiseBurst(audio, 0.25, 0.35); burst(audio, 70, 0.3, 0.3, 'sine'); }
export function door(audio) { burst(audio, 220, 0.08, 0.2, 'triangle'); }
export function swing(audio) { noiseBurst(audio, 0.08, 0.15); }
export function reload(audio) { burst(audio, 520, 0.07, 0.18, 'triangle'); burst(audio, 660, 0.07, 0.18, 'triangle'); }

export function passed(audio) {
  if (ensureContext(audio) === false) { return; }
  const notes = [523, 659, 784, 1047];
  for (let i = 0; i < notes.length; i += 1) {
    const delay = i * 0.12;
    window.setTimeout(function playNote() { burst(audio, notes[i], 0.35, 0.25, 'triangle'); }, delay * 1000);
  }
}

const BASSLINE = [55, 0, 65.4, 0, 49, 0, 58.3, 0, 55, 0, 65.4, 0, 73.4, 0, 82.4, 0];

export function musicTick(audio, dt) {
  if (audio.ready === false) { return; }
  if (audio.muted) { return; }
  audio.musicTimer -= dt;
  if (audio.musicTimer <= 0) {
    audio.musicTimer = 0.32;
    const note = BASSLINE[audio.musicStep % BASSLINE.length];
    audio.musicStep += 1;
    if (note > 0) {
      burst(audio, note, 0.3, 0.12, 'sawtooth');
    }
    if (audio.sirenOn) {
      const target = audio.sirenOsc.frequency.value > 800 ? 700 : 950;
      audio.sirenOsc.frequency.value = target;
    }
  }
}

export function toggleMute(audio) {
  audio.muted = audio.muted === false;
  if (audio.ready) {
    if (audio.muted) {
      audio.engineGain.gain.value = 0;
      audio.sirenGain.gain.value = 0;
    }
  }
  return audio.muted;
}
