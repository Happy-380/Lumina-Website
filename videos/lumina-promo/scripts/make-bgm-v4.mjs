// make-bgm.mjs — offline BGM for the Lumina series film.
//
// No sign-in for the HeyGen music catalog on this machine, so the bed is composed
// here instead: a warm analog-pad track at 84 BPM in A minor, sectioned so its
// changes land exactly on the film's frame boundaries
// (7.5 / 15 / 24 / 33 / 37.5 / 43 s, end 50.0 s).
//
//   node scripts/make-bgm.mjs [out.wav]
//
// Pure Node, no dependencies. Deterministic (seeded noise).
import fs from "node:fs";
import path from "node:path";

const SR = 44100;
const DUR = 65.0;
const N = Math.round(SR * DUR);
const BPM = 84;
const BEAT = 60 / BPM;

// deterministic noise
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- buffers
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const pad = bus();
const keys = bus(); // pluck / arp
const bass = bus();
const drums = bus();
const air = bus(); // noise bed + risers
const send = bus(); // reverb send

const add = (b, i, v, pan) => {
  if (i < 0 || i >= N) return;
  const p = clamp(pan, -1, 1);
  const l = Math.cos(((p + 1) * Math.PI) / 4);
  const r = Math.sin(((p + 1) * Math.PI) / 4);
  b.L[i] += v * l * 1.414;
  b.R[i] += v * r * 1.414;
};
const addSend = (i, v) => {
  if (i < 0 || i >= N) return;
  send.L[i] += v;
  send.R[i] += v;
};

// ---------------------------------------------------------------- envelope
const env = (t, dur, a, d, s, r) => {
  // simple ADSR, t is time since note start, dur is held length
  if (t < 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return lerp(1, s, (t - a) / d);
  if (t < dur) return s;
  const rel = t - dur;
  if (rel < r) return s * (1 - rel / r);
  return 0;
};

// ---------------------------------------------------------------- one-pole LP
class OnePole {
  constructor() {
    this.z = 0;
  }
  run(x, cutoff) {
    const c = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
    this.z += c * (x - this.z);
    return this.z;
  }
}

// ---------------------------------------------------------------- sections
// chord tones as MIDI
const CH = {
  Am: [45, 52, 57, 60, 64],
  F: [41, 48, 53, 57, 60],
  C: [36, 43, 48, 55, 60],
  G: [43, 50, 55, 59, 62],
  Fmaj9: [41, 48, 57, 60, 64],
  Cmaj9: [36, 48, 55, 59, 64],
};
const ROOT = { Am: 33, F: 29, C: 36, G: 31, Fmaj9: 29, Cmaj9: 36 };

// ── the film's own section map: every boundary is a cut or a studio arrival ──
// 0 opening · 7.5 Core · 14.5 Engine · 24 Voice · 31 Artist · 38.5 Animate ·
// 46.5 AR · 58.5 close
const SEG = [
  [0.0, 7.5, 'Am', 0.85, { airy: true }],
  [7.5, 14.5, 'F', 0.95, { airy: true, pluck: true, hats: 0.08 }],
  [14.5, 18.0, 'C', 1.0, { kick: 0.4, hats: 0.2, arp: 0.55, bassline: 1, ticks: true }],
  [18.0, 21.0, 'G', 1.05, { kick: 0.45, hats: 0.24, arp: 0.8, bassline: 1, ticks: true }],
  [21.0, 24.0, 'Am', 1.1, { kick: 0.5, hats: 0.28, arp: 1, bassline: 1, riser: true }],
  [24.0, 27.5, 'Am', 1.0, { airy: true, bell: true }],
  [27.5, 31.0, 'F', 1.0, { airy: true, bell: true }],
  [31.0, 34.5, 'C', 1.02, { airy: true, pluck: true, hats: 0.1 }],
  [34.5, 38.5, 'G', 1.05, { airy: true, pluck: true, hats: 0.14, arpSoft: 1 }],
  [38.5, 42.0, 'G', 1.12, { kick: 0.42, hats: 0.3, arp: 1, bassline: 1 }],
  [42.0, 46.5, 'C', 1.12, { kick: 0.46, hats: 0.34, arp: 1, bassline: 1 }],
  [46.5, 52.0, 'F', 1.06, { airy: true, bell: true }],
  [52.0, 58.5, 'Am', 1.04, { airy: true, bell: true, hats: 0.08 }],
  [58.5, 62.0, 'Fmaj9', 1.12, { airy: true, pluck: true }],
  [62.0, 65.0, 'Cmaj9', 1.16, { airy: true, pluck: true, bell: true }],
];
const bars = SEG.map(([t, end, chord, level, opts]) => ({ t, chord, level, dur: end - t, ...opts }));

// ---------------------------------------------------------------- instruments
function playPad(t0, dur, chord, level, airy) {
  const notes = CH[chord];
  const filt = [new OnePole(), new OnePole(), new OnePole()];
  const attack = airy ? 1.6 : 0.55;
  const release = airy ? 1.8 : 0.9;
  const end = t0 + dur + release;
  const i0 = Math.round(t0 * SR);
  const i1 = Math.min(N, Math.round(end * SR));
  const detunes = [-6, 0, 7]; // cents-ish
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const e = env(t, dur, attack, 0.6, 0.82, release);
    if (e <= 0) continue;
    let s = 0;
    for (let n = 0; n < notes.length; n++) {
      const f = mtof(notes[n] + (n === 0 ? -12 : 0));
      for (let d = 0; d < detunes.length; d++) {
        const fd = f * Math.pow(2, detunes[d] / 1200);
        const ph = 2 * Math.PI * fd * t + n * 1.7 + d * 0.9;
        // band-limited-ish saw via few harmonics
        s +=
          (Math.sin(ph) * 0.62 + Math.sin(2 * ph) * 0.22 + Math.sin(3 * ph) * 0.1 + Math.sin(4 * ph) * 0.05) *
          (1 / (n * 0.5 + 1)) /
          3;
      }
    }
    const cutoff = airy ? 900 : 1400 + 900 * Math.min(1, t / 2.2);
    s = filt[0].run(s, cutoff);
    s = filt[1].run(s, cutoff * 1.35);
    const trem = 1 + 0.05 * Math.sin(2 * Math.PI * 0.23 * (t + t0));
    const v = s * e * level * 0.5 * trem;
    add(pad, i, v, detunes[0] > 0 ? 0.35 : -0.35);
    addSend(i, v * 0.55);
  }
}

function playPluck(t0, midi, dur, level, pan = 0, bright = 1) {
  const f = mtof(midi);
  const i0 = Math.round(t0 * SR);
  const i1 = Math.min(N, Math.round((t0 + dur * 3) * SR));
  const lp = new OnePole();
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const a = Math.min(1, t / 0.006);
    const d = Math.exp(-t / (dur * 0.55));
    const e = a * d;
    if (e < 1e-4) continue;
    const ph = 2 * Math.PI * f * t;
    // FM-ish bell/tine
    const mod = Math.sin(ph * 2.002) * 1.6 * Math.exp(-t / (dur * 0.22));
    let s = Math.sin(ph + mod) * 0.75 + Math.sin(ph * 2) * 0.18 * bright;
    s = lp.run(s, 2200 + 2600 * Math.exp(-t / 0.25));
    const v = s * e * level * 0.25;
    add(keys, i, v, pan);
    addSend(i, v * 0.6);
  }
}

function playBass(t0, midi, dur, level) {
  const f = mtof(midi);
  const i0 = Math.round(t0 * SR);
  const i1 = Math.min(N, Math.round((t0 + dur) * SR));
  const lp = new OnePole();
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const e = env(t, dur * 0.82, 0.012, 0.1, 0.7, 0.12);
    if (e <= 0) continue;
    const ph = 2 * Math.PI * f * t;
    let s = Math.sin(ph) * 0.9 + Math.sin(ph * 2) * 0.14 + Math.sin(ph * 3) * 0.05;
    s = lp.run(s, 320);
    const v = s * e * level * 0.5;
    add(bass, i, v, 0);
  }
}

function playKick(t0, level) {
  const i0 = Math.round(t0 * SR);
  const i1 = Math.min(N, Math.round((t0 + 0.42) * SR));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const f = 46 + 62 * Math.exp(-t / 0.035);
    const ph = 2 * Math.PI * f * t;
    const e = Math.exp(-t / 0.12) * Math.min(1, t / 0.002);
    const click = Math.exp(-t / 0.006) * 0.4;
    const v = (Math.sin(ph) * e + rnd() * click * 0.06) * level * 0.85;
    add(drums, i, v, 0);
  }
}

function playHat(t0, level, open = false) {
  const i0 = Math.round(t0 * SR);
  const d = open ? 0.13 : 0.035;
  const i1 = Math.min(N, Math.round((t0 + d * 4) * SR));
  const hp = { z: 0 };
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const n = rnd();
    const hpc = 0.55;
    const h = n - hp.z;
    hp.z += hpc * (n - hp.z);
    const e = Math.exp(-t / d);
    const v = h * e * level * 0.16;
    add(drums, i, v, open ? 0.25 : -0.18);
  }
}

function playShaker(t0, level) {
  const i0 = Math.round(t0 * SR);
  const i1 = Math.min(N, Math.round((t0 + 0.14) * SR));
  const hp = { z: 0 };
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const n = rnd();
    const h = n - hp.z;
    hp.z += 0.7 * (n - hp.z);
    const e = Math.exp(-t / 0.03) * Math.min(1, t / 0.006);
    add(air, i, h * e * level * 0.1, 0.4);
  }
}

function playRiser(t0, dur, level) {
  const i0 = Math.round(t0 * SR);
  const i1 = Math.min(N, Math.round((t0 + dur) * SR));
  const hp = { z: 0 };
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const k = t / dur;
    const n = rnd();
    const h = n - hp.z;
    hp.z += lerp(0.9, 0.45, k) * (n - hp.z);
    const e = Math.pow(k, 2.4) * (1 - Math.max(0, (k - 0.92) / 0.08));
    add(air, i, h * e * level * 0.3, Math.sin(k * 6) * 0.5);
  }
}

// ---------------------------------------------------------------- arrangement
for (const b of bars) {
  playPad(b.t - 0.05, b.dur, b.chord, 0.9 * b.level * 0.85, !!b.airy);

  if (b.kick) {
    const beats = [0, 1, 2, 3];
    for (const bt of beats) playKick(b.t + bt * BEAT, b.kick * (bt % 2 === 0 ? 1 : 0.72));
  }
  if (b.hats) {
    for (let e = 0; e < 8; e++) {
      const off = e % 2 === 1;
      playHat(b.t + (e * BEAT) / 2, b.hats * (off ? 1 : 0.45), false);
    }
    playHat(b.t + 3.5 * BEAT, b.hats * 0.8, true);
  }
  if (b.kick && b.hats && b.arp) {
    for (let e = 0; e < 16; e++) playShaker(b.t + (e * BEAT) / 4, b.hats * 0.5 * (e % 4 === 2 ? 1 : 0.45));
  }

  if (b.drone) playBass(b.t, ROOT[b.chord] - 12, b.dur * 0.95, 0.55 * b.level);

  if (b.bassline) {
    const root = ROOT[b.chord];
    const patt = [0, 0, 0, 7, 0, 0, 12, 7];
    for (let e = 0; e < 8; e++) {
      const m = root + (patt[e] === 12 && b.oct ? 12 : patt[e]);
      playBass(b.t + (e * BEAT) / 2, m, BEAT * 0.42, 0.9 * b.level);
    }
  }

  if (b.arp) {
    const notes = CH[b.chord].map((n) => n + 12);
    const order = [0, 2, 1, 3, 2, 4, 3, 1];
    for (let s = 0; s < 8; s++) {
      const m = notes[order[s] % notes.length];
      playPluck(b.t + (s * BEAT) / 2, m, 0.42, 0.5 * b.arp * b.level, s % 2 ? 0.3 : -0.3, 0.7);
    }
  }
  if (b.arpSoft) {
    const notes = CH[b.chord].map((n) => n + 12);
    const order = [0, 2, 3, 4];
    for (let s = 0; s < 4; s++)
      playPluck(b.t + s * BEAT, notes[order[s] % notes.length], 0.8, 0.45 * b.level, s % 2 ? 0.25 : -0.25, 0.5);
  }
  if (b.pluck) {
    // motif B — slow, more space
    const notes = CH[b.chord];
    const seq = [notes[2] + 24, notes[4] + 12, notes[3] + 24, notes[1] + 24];
    seq.forEach((m, s) => playPluck(b.t + s * BEAT * 1.0, m, 0.95, 0.5 * b.level, s % 2 ? 0.35 : -0.35, 0.6));
  }
  if (b.riser) playRiser(b.t + b.dur - 2.4, 2.4, 0.8);
  if (b.bell) {
    const notes = CH[b.chord];
    const bells = [notes[3] + 24, notes[1] + 36, notes[4] + 24];
    bells.forEach((m, k) => playPluck(b.t + 0.6 + k * (b.dur / 3), m, 1.5, 0.34 * b.level, k % 2 ? 0.3 : -0.3, 0.35));
  }
  if (b.ticks) {
    for (let k = 0; k < 8; k++) playHat(b.t + (k * BEAT) / 4, 0.12 * b.level, false);
  }
}

// section-boundary risers for the cut points
playRiser(6.4, 1.0, 0.32);
playRiser(31.4, 1.6, 0.55);
playRiser(41.2, 1.6, 0.45);

// ---------------------------------------------------------------- noise bed
{
  const lpL = new OnePole();
  const lpR = new OnePole();
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 2) * Math.min(1, Math.max(0, (DUR - t) / 1.5));
    const l = lpL.run(rnd(), 900) * 0.02 * fade;
    const r = lpR.run(rnd(), 900) * 0.02 * fade;
    air.L[i] += l;
    air.R[i] += r;
  }
}

// ---------------------------------------------------------------- reverb (Schroeder)
function reverb(input, out, { mix = 0.35, size = 1 } = {}) {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(d * 2.1 * size));
  const aps = [225, 556].map((d) => Math.round(d * 1.9 * size));
  const accL = new Float32Array(combs.length * 1);
  const combsL = combs.map((d) => ({ buf: new Float32Array(d), idx: 0, d }));
  const combsR = combs.map((d) => ({ buf: new Float32Array(Math.round(d * 1.03)), idx: 0, d: Math.round(d * 1.03) }));
  const apL = aps.map((d) => ({ buf: new Float32Array(d), idx: 0, d }));
  const apR = aps.map((d) => ({ buf: new Float32Array(Math.round(d * 1.07)), idx: 0, d: Math.round(d * 1.07) }));
  const fb = 0.83;

  for (let i = 0; i < N; i++) {
    let l = 0;
    let r = 0;
    for (let c = 0; c < combsL.length; c++) {
      const cb = combsL[c];
      const v = cb.buf[cb.idx];
      cb.buf[cb.idx] = (input.L[i] + input.R[i]) * 0.5 * 0.25 + v * fb;
      cb.idx = (cb.idx + 1) % cb.d;
      l += v;
      const cr = combsR[c];
      const vr = cr.buf[cr.idx];
      cr.buf[cr.idx] = (input.L[i] + input.R[i]) * 0.5 * 0.25 + vr * fb;
      cr.idx = (cr.idx + 1) % cr.d;
      r += vr;
    }
    for (let a = 0; a < apL.length; a++) {
      const ab = apL[a];
      const v = ab.buf[ab.idx];
      const inp = l;
      ab.buf[ab.idx] = inp + v * 0.5;
      ab.idx = (ab.idx + 1) % ab.d;
      l = v - inp * 0.5;
      const ar = apR[a];
      const vr = ar.buf[ar.idx];
      const inr = r;
      ar.buf[ar.idx] = inr + vr * 0.5;
      ar.idx = (ar.idx + 1) % ar.d;
      r = vr - inr * 0.5;
    }
    out.L[i] += l * mix * 0.7;
    out.R[i] += r * mix * 0.7;
  }
}
const wet = bus();
reverb(send, wet, { mix: 0.55, size: 1.15 });

// ---------------------------------------------------------------- ping-pong delay on keys
const delay = bus();
{
  const d = Math.round((BEAT * 3) / 4 * SR * 2); // dotted-ish 3/8 across both taps
  const bufL = new Float32Array(d);
  const bufR = new Float32Array(d);
  let p = 0;
  const lpL = new OnePole();
  const lpR = new OnePole();
  const fb = 0.34;
  for (let i = 0; i < N; i++) {
    const tapL = bufL[p];
    const tapR = bufR[p];
    const inL = keys.L[i] * 0.5;
    const inR = keys.R[i] * 0.5;
    bufL[p] = inL + tapR * fb;
    bufR[p] = tapL * fb;
    p = (p + 1) % d;
    delay.L[i] = lpL.run(tapL, 2400) * 0.55;
    delay.R[i] = lpR.run(tapR, 2400) * 0.55;
  }
}

// ---------------------------------------------------------------- mix
const mixL = new Float32Array(N);
const mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.6);
  const fadeOut = clamp((DUR - t) / 0.7, 0, 1);
  const master = Math.pow(fadeOut, 1.4) * fadeIn;
  mixL[i] =
    (pad.L[i] * 0.62 +
      keys.L[i] * 0.72 +
      delay.L[i] * 0.9 +
      bass.L[i] * 0.8 +
      drums.L[i] * 0.85 +
      air.L[i] * 0.5 +
      wet.L[i] * 0.8) *
    master;
  mixR[i] =
    (pad.R[i] * 0.62 +
      keys.R[i] * 0.72 +
      delay.R[i] * 0.9 +
      bass.R[i] * 0.8 +
      drums.R[i] * 0.85 +
      air.R[i] * 0.5 +
      wet.R[i] * 0.8) *
    master;
}

// gentle bus saturation + dc block
function finish(arr) {
  let dc = 0;
  let prevIn = 0;
  let prevOut = 0;
  for (let i = 0; i < N; i++) {
    dc = arr[i] - prevIn + 0.9995 * dc;
    prevIn = arr[i];
    prevOut = dc;
    arr[i] = Math.tanh(prevOut * 1.15);
  }
}

finish(mixL);
finish(mixR);

// RMS normalize to a bed level (about -15 dBFS RMS)
function rms(a) {
  let s = 0;
  for (let i = 0; i < N; i++) s += a[i] * a[i];
  return Math.sqrt(s / N);
}
const cur = Math.max(rms(mixL), rms(mixR));
const target = Math.pow(10, -16 / 20);
const gain = target / (cur || 1);
let peak = 0;
for (let i = 0; i < N; i++) {
  mixL[i] *= gain;
  mixR[i] *= gain;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}
const limiter = Math.min(1, 0.97 / (peak || 1));
for (let i = 0; i < N; i++) {
  mixL[i] = clamp(mixL[i] * limiter, -1, 1);
  mixR[i] = clamp(mixR[i] * limiter, -1, 1);
}

// ---------------------------------------------------------------- write wav
const out = path.resolve(process.argv[2] || "assets/audio/bgm.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
const dataBytes = N * 4;
const buf = Buffer.alloc(44 + dataBytes);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(2, 22); // stereo
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(dataBytes, 40);
let o = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(mixL[i] * 32767), o);
  buf.writeInt16LE(Math.round(mixR[i] * 32767), o + 2);
  o += 4;
}
fs.writeFileSync(out, buf);
console.log(`bgm: ${out} ${DUR}s rms=${(20 * Math.log10(target)).toFixed(1)}dBFS peak=${(20 * Math.log10(peak * limiter)).toFixed(1)}dBFS`);
