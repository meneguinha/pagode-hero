// Gera o mapa de notas direto do stem do cavaquinho (guitar), para que cada nota
// caia exatamente onde existe uma palhetada no áudio.
//
// 1. Spectral flux (FFT 1024 / hop 512) mede o "ataque" de cada janela.
// 2. Picos acima de um limiar adaptativo viram candidatos a nota.
// 3. A dificuldade define o intervalo mínimo entre notas (os ataques mais fortes ganham).
// 4. A faixa (A/S/K/L) vem do brilho do som (centróide espectral) logo após o ataque.

import type { Difficulty, Note } from '../types';

const FFT_SIZE = 1024;
const HOP = 512;

const MIN_GAP_BY_DIFFICULTY: Record<Difficulty, number> = {
  facil: 0.5,
  medio: 0.3,
  mestre: 0.2,
};

// Uma nota dourada (Star Power) a cada bloco de N segundos
const STAR_POWER_BLOCK_SECONDS = 12;

const cache = new Map<string, Note[]>();

export function generateChart(buffer: AudioBuffer, difficulty: Difficulty, cacheKey: string): Note[] {
  const key = `${cacheKey}:${difficulty}`;
  const cached = cache.get(key);
  if (cached) return cached.map((n) => ({ ...n }));

  const analysis = getAnalysis(buffer, cacheKey);
  const minGap = MIN_GAP_BY_DIFFICULTY[difficulty];

  // Os ataques mais fortes têm prioridade ao respeitar o intervalo mínimo
  const accepted: Onset[] = [];
  const byStrength = [...analysis.onsets].sort((a, b) => b.strength - a.strength);
  const taken: number[] = [];
  for (const onset of byStrength) {
    if (taken.some((t) => Math.abs(t - onset.time) < minGap)) continue;
    taken.push(onset.time);
    accepted.push(onset);
  }
  accepted.sort((a, b) => a.time - b.time);

  // Faixa pela posição do brilho entre os quartis da música inteira
  const centroids = accepted.map((o) => o.centroid).sort((a, b) => a - b);
  const q = (p: number) => centroids[Math.floor(p * (centroids.length - 1))] ?? 0;
  const bounds = [q(0.25), q(0.5), q(0.75)];
  const laneOf = (c: number) => bounds.filter((b) => c > b).length;

  // Star Power: o ataque mais forte de cada bloco
  const starIds = new Set<number>();
  const blocks = new Map<number, Onset>();
  for (const o of accepted) {
    const block = Math.floor(o.time / STAR_POWER_BLOCK_SECONDS);
    const best = blocks.get(block);
    if (!best || o.strength > best.strength) blocks.set(block, o);
  }
  blocks.forEach((o) => starIds.add(o.time));

  const notes: Note[] = accepted.map((o, i) => ({
    id: `auto_${i}`,
    time: parseFloat(o.time.toFixed(3)),
    track: laneOf(o.centroid),
    isStarPower: starIds.has(o.time),
  }));

  cache.set(key, notes);
  return notes.map((n) => ({ ...n }));
}

interface Onset {
  time: number;
  strength: number;
  centroid: number;
}

const analysisCache = new Map<string, { onsets: Onset[] }>();

function getAnalysis(buffer: AudioBuffer, cacheKey: string) {
  const cached = analysisCache.get(cacheKey);
  if (cached) return cached;

  const mono = toMono(buffer);
  const sr = buffer.sampleRate;
  const frameCount = Math.floor((mono.length - FFT_SIZE) / HOP);
  const bins = FFT_SIZE / 2;

  const window = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT_SIZE);

  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  let prevMag = new Float32Array(bins);
  let mag = new Float32Array(bins);
  const flux = new Float32Array(frameCount);
  const centroid = new Float32Array(frameCount);
  const rms = new Float32Array(frameCount);

  for (let f = 0; f < frameCount; f++) {
    const offset = f * HOP;
    let energy = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const s = mono[offset + i];
      energy += s * s;
      re[i] = s * window[i];
      im[i] = 0;
    }
    rms[f] = Math.sqrt(energy / FFT_SIZE);
    fft(re, im);

    let sum = 0;
    let weighted = 0;
    let positiveDiff = 0;
    for (let k = 1; k < bins; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      mag[k] = m;
      const d = m - prevMag[k];
      if (d > 0) positiveDiff += d;
      sum += m;
      weighted += m * k;
    }
    flux[f] = positiveDiff;
    centroid[f] = sum > 0 ? weighted / sum : 0;
    [prevMag, mag] = [mag, prevMag];
  }

  // Limiar adaptativo: média local (±0,25s) + margem; ignora trechos quase silenciosos
  const halfWin = Math.round((0.25 * sr) / HOP);
  const peakRadius = 3;
  const maxRms = rms.reduce((a, b) => Math.max(a, b), 0);
  const silence = maxRms * 0.06;
  const onsets: Onset[] = [];

  for (let f = peakRadius; f < frameCount - peakRadius; f++) {
    if (rms[Math.min(frameCount - 1, f + 2)] < silence) continue;

    let isPeak = true;
    for (let j = f - peakRadius; j <= f + peakRadius; j++) {
      if (flux[j] > flux[f]) {
        isPeak = false;
        break;
      }
    }
    if (!isPeak) continue;

    let local = 0;
    let count = 0;
    for (let j = Math.max(0, f - halfWin); j < Math.min(frameCount, f + halfWin); j++) {
      local += flux[j];
      count++;
    }
    const mean = local / count;
    if (flux[f] < mean * 1.35) continue;

    // Brilho medido logo após o ataque (onde o acorde soa)
    let c = 0;
    const end = Math.min(frameCount, f + 5);
    for (let j = f + 1; j < end; j++) c += centroid[j];
    c /= Math.max(1, end - f - 1);

    // O centro da janela da FFT é o instante do ataque
    onsets.push({ time: (f * HOP + FFT_SIZE / 2) / sr, strength: flux[f] - mean, centroid: c });
  }

  const result = { onsets };
  analysisCache.set(cacheKey, result);
  return result;
}

function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const l = buffer.getChannelData(0);
  const r = buffer.getChannelData(1);
  const out = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) out[i] = (l[i] + r[i]) * 0.5;
  return out;
}

// FFT radix-2 in-place (tamanho potência de 2)
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j;
        const b = a + len / 2;
        const tRe = re[b] * curRe - im[b] * curIm;
        const tIm = re[b] * curIm + im[b] * curRe;
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}
