/*
 * Trilha do vídeo de apresentação: uma caixinha de música calma, composta e
 * sintetizada aqui mesmo (sem amostras nem arquivos de terceiros).
 *
 *   node scripts/music.mjs   →   public/trilha.wav
 *
 * 80 bpm, 4/4, 20 compassos de 3 s. Progressão C – Am – F – G, com uma base
 * suave (pad + baixo), arpejo de sininho e uma melodia esparsa por cima.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const BEAT = 60 / 80;
const BAR = BEAT * 4;
const BARS = 20;
const LENGTH = BARS * BAR + 2.5;
const N = Math.ceil(LENGTH * SR);

const left = new Float32Array(N);
const right = new Float32Array(N);

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Soma uma nota ao buffer. `voice(t, f)` devolve a amostra no instante t (s). */
function note(start, duration, midi, gain, pan, voice) {
  const f = hz(midi);
  const from = Math.floor(start * SR);
  const to = Math.min(N, from + Math.ceil(duration * SR));
  const l = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const r = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = from; i < to; i++) {
    const t = (i - from) / SR;
    const s = voice(t, f, duration);
    left[i] += s * l;
    right[i] += s * r;
  }
}

const TAU = Math.PI * 2;

/** Sininho de caixa de música: ataque rápido, cauda longa, parciais levemente desafinados. */
const bell = (t, f) => {
  const attack = Math.min(1, t / 0.004);
  return (
    attack *
    (Math.sin(TAU * f * t) * Math.exp(-t * 2.6) +
      0.32 * Math.sin(TAU * f * 2.003 * t) * Math.exp(-t * 4.5) +
      0.12 * Math.sin(TAU * f * 3.01 * t) * Math.exp(-t * 7) +
      0.05 * Math.sin(TAU * f * 5.2 * t) * Math.exp(-t * 14))
  );
};

/** Pad: senoides com entrada e saída lentas e um leve batimento. */
const pad = (t, f, d) => {
  const env = Math.min(1, t / 1.2) * Math.min(1, Math.max(0, (d - t) / 1.4));
  return env * (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.004 * t) + 0.18 * Math.sin(TAU * f * 2 * t));
};

/** Baixo redondo, quase só fundamental. */
const bass = (t, f, d) => {
  const env = Math.min(1, t / 0.03) * Math.exp(-t * 0.9) * Math.min(1, Math.max(0, (d - t) / 0.2));
  return env * (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t));
};

// Acordes (MIDI): baixo, notas do pad e notas do arpejo.
const CHORDS = [
  { bass: 36, pad: [48, 55, 64, 67], arp: [60, 64, 67, 72, 74, 72, 67, 64] }, // C (add9)
  { bass: 33, pad: [45, 52, 60, 64], arp: [57, 60, 64, 69, 72, 69, 64, 60] }, // Am
  { bass: 29, pad: [41, 48, 57, 60], arp: [53, 57, 60, 65, 69, 65, 60, 57] }, // F
  { bass: 31, pad: [43, 50, 59, 62], arp: [55, 59, 62, 67, 71, 67, 62, 59] }, // G
];

// Melodia: [compasso (a partir de 0), tempo dentro do compasso, nota MIDI].
const MELODY = [
  [4, 0, 76], [4, 2, 79], [5, 0, 81], [5, 2.5, 76], [6, 0, 77], [6, 2, 81], [7, 0, 79], [7, 2, 74],
  [8, 0, 76], [8, 1.5, 79], [8, 3, 84], [9, 0, 81], [9, 2, 76], [10, 0, 77], [10, 2, 72], [11, 0, 74], [11, 2, 79],
  [12, 0, 84], [12, 2, 79], [13, 0, 81], [13, 2.5, 84], [14, 0, 81], [14, 2, 77], [15, 0, 79], [15, 2, 74],
  [16, 0, 76], [16, 2, 72], [17, 0, 72], [18, 0, 69], [18, 2, 72], [19, 0, 67],
];

for (let bar = 0; bar < BARS; bar++) {
  const chord = CHORDS[bar % 4];
  const t0 = bar * BAR;
  // No último compasso a harmonia repousa em dó.
  const { bass: low, pad: tones, arp } = bar === BARS - 1 ? CHORDS[0] : chord;

  for (const midi of tones) note(t0, BAR + 1.2, midi, 0.055, 0, pad);
  note(t0, BAR, low, 0.2, 0, bass);

  // Começo e fim mais vazios: uma nota por tempo. No miolo, colcheias.
  const sparse = bar < 4 || bar >= BARS - 3;
  const steps = sparse ? 4 : 8;
  for (let step = 0; step < steps; step++) {
    if (bar === BARS - 1 && step > 0) break;
    const midi = arp[sparse ? step * 2 : step];
    const pan = step % 2 === 0 ? -0.35 : 0.35;
    const accent = step === 0 ? 1 : 0.72;
    note(t0 + step * (BAR / steps), 2.4, midi, 0.14 * accent, pan, bell);
  }
}

for (const [bar, beat, midi] of MELODY) {
  note(bar * BAR + beat * BEAT, 3.2, midi, 0.17, 0.08, bell);
}
// Acorde final, arpejado devagar.
[60, 64, 67, 72, 76].forEach((midi, i) => note((BARS - 1) * BAR + 0.12 * i, 5, midi, 0.13, (i - 2) * 0.2, bell));

/** Reverberação simples (filtros pente + passa-tudo), para dar "sala" ao sininho. */
function reverb(input, combs, seed) {
  const out = new Float32Array(input.length);
  for (const [delaySec, feedback] of combs) {
    const delay = Math.floor((delaySec + seed) * SR);
    const buffer = new Float32Array(delay);
    let lowpass = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buffer[i % delay];
      lowpass = y * 0.6 + lowpass * 0.4; // abafa os agudos a cada volta
      buffer[i % delay] = input[i] + lowpass * feedback;
      out[i] += y;
    }
  }
  for (const delaySec of [0.0051, 0.0126]) {
    const delay = Math.floor(delaySec * SR);
    const buffer = new Float32Array(delay);
    for (let i = 0; i < out.length; i++) {
      const delayed = buffer[i % delay];
      const x = out[i] + delayed * 0.5;
      buffer[i % delay] = x;
      out[i] = delayed - x * 0.5;
    }
  }
  return out;
}

const COMBS = [
  [0.0297, 0.8],
  [0.0371, 0.78],
  [0.0411, 0.76],
  [0.0437, 0.74],
];
const wetL = reverb(left, COMBS, 0);
const wetR = reverb(right, COMBS, 0.0007);

let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.6) * Math.min(1, Math.max(0, (LENGTH - t) / 3));
  left[i] = (left[i] + wetL[i] * 0.22) * fade;
  right[i] = (right[i] + wetR[i] * 0.22) * fade;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}

// WAV PCM 16 bits, estéreo.
const gain = 0.8 / peak;
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * gain)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * gain)) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const file = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "trilha.wav");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, Buffer.concat([header, data]));
console.log(`trilha.wav: ${LENGTH.toFixed(1)} s, ${(data.length / 1e6).toFixed(1)} MB, pico original ${peak.toFixed(2)}`);
