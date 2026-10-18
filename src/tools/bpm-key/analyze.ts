/*
 * Tempo and key of a song, from its decoded samples.
 *
 * Tempo: a spectral-flux onset envelope (how much louder each frequency band
 * got since the previous frame), autocorrelated; the strongest lag between
 * 50 and 220 BPM wins, weighted towards ~120 BPM so a song is not reported at
 * half or double speed without reason.
 *
 * Key: a chromagram (energy per pitch class, summed over the song) compared
 * with the Krumhansl–Kessler major and minor key profiles in all 12
 * transpositions; the best correlation is the key.
 */

import { pc } from '@/lib/music'

/** Sample rate the analysis works at: plenty for beats and pitch up to ~5 kHz. */
export const RATE = 11025

export interface Analysis {
  bpm: number
  /** 0–1, how clearly one tempo stood out. */
  bpmConfidence: number
  key: { tonic: number; minor: boolean }
  /** 0–1, how far the winning key is ahead of the runner-up. */
  keyConfidence: number
  /** The best few keys, best first, for "or maybe…". */
  keys: { tonic: number; minor: boolean; score: number }[]
  seconds: number
}

/* ---- FFT ---- */

function makeFft(size: number) {
  const levels = Math.log2(size)
  const rev = new Uint32Array(size)
  for (let i = 0; i < size; i++) {
    let r = 0
    for (let b = 0; b < levels; b++) r |= ((i >> b) & 1) << (levels - 1 - b)
    rev[i] = r
  }
  const cos = new Float64Array(size / 2)
  const sin = new Float64Array(size / 2)
  for (let i = 0; i < size / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / size)
    sin[i] = Math.sin((2 * Math.PI * i) / size)
  }
  const window = new Float64Array(size)
  for (let i = 0; i < size; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size)
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  const mags = new Float64Array(size / 2)

  /** Magnitude spectrum of samples[start … start+size), Hann-windowed. Reuses its output array. */
  return (samples: Float32Array, start: number) => {
    for (let i = 0; i < size; i++) {
      re[rev[i]] = samples[start + i] * window[i]
      im[rev[i]] = 0
    }
    for (let len = 2; len <= size; len <<= 1) {
      const half = len >> 1
      const step = size / len
      for (let i = 0; i < size; i += len) {
        for (let j = 0; j < half; j++) {
          const k = j * step
          const a = i + j
          const b = a + half
          const tr = re[b] * cos[k] + im[b] * sin[k]
          const ti = im[b] * cos[k] - re[b] * sin[k]
          re[b] = re[a] - tr
          im[b] = im[a] - ti
          re[a] += tr
          im[a] += ti
        }
      }
    }
    for (let i = 0; i < size / 2; i++) mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
    return mags
  }
}

/* ---- Tempo ---- */

const ONSET_FFT = 1024
const ONSET_HOP = 256

function onsetEnvelope(samples: Float32Array) {
  const fft = makeFft(ONSET_FFT)
  const frames = Math.max(0, Math.floor((samples.length - ONSET_FFT) / ONSET_HOP))
  const env = new Float64Array(frames)
  let prev = new Float64Array(ONSET_FFT / 2)
  for (let f = 0; f < frames; f++) {
    const mags = fft(samples, f * ONSET_HOP)
    let flux = 0
    const cur = new Float64Array(mags.length)
    for (let i = 1; i < mags.length; i++) {
      cur[i] = Math.log1p(100 * mags[i])
      const d = cur[i] - prev[i]
      if (d > 0) flux += d
    }
    env[f] = flux
    prev = cur
  }
  // Remove the slowly moving loudness so only the attacks remain.
  const radius = Math.round((0.25 * RATE) / ONSET_HOP)
  const out = new Float64Array(frames)
  let sum = 0
  for (let i = 0; i < Math.min(frames, radius); i++) sum += env[i]
  for (let i = 0; i < frames; i++) {
    if (i + radius < frames) sum += env[i + radius]
    if (i - radius - 1 >= 0) sum -= env[i - radius - 1]
    const count = Math.min(frames, i + radius + 1) - Math.max(0, i - radius)
    out[i] = Math.max(0, env[i] - sum / count)
  }
  return out
}

function tempo(env: Float64Array): { bpm: number; confidence: number } {
  const fps = RATE / ONSET_HOP
  const COMB = 4
  const FINE = 16
  const maxLag = Math.min(env.length - 2, Math.ceil((60 * fps) / 50) * FINE + 2)
  const acf = new Float64Array(maxLag + 1)
  let mean = 0
  for (const v of env) mean += v
  mean /= env.length || 1
  for (let lag = 0; lag <= maxLag; lag++) {
    let s = 0
    for (let i = 0; i + lag < env.length; i++) s += (env[i] - mean) * (env[i + lag] - mean)
    acf[lag] = s / (env.length - lag || 1)
  }
  const zero = acf[0] || 1
  // The beat period rarely falls on a whole frame, so read the ACF between frames.
  const at = (x: number) => {
    const i = Math.floor(x)
    return i + 1 > maxLag ? 0 : acf[i] + (acf[i + 1] - acf[i]) * (x - i)
  }

  let best = 0
  let bestScore = -Infinity
  let bestPeriodicity = 0
  for (let bpm = 50; bpm <= 220; bpm += 0.05) {
    const lag = (60 * fps) / bpm
    // A comb over the first few multiples: a real beat lines up at all of them.
    let comb = 0
    for (let k = 1; k <= COMB; k++) comb += at(k * lag)
    comb /= COMB * zero
    // Each multiple of the beat scores alike, so lean towards the tempos
    // people tap along to (centred on 120 BPM, about an octave wide).
    const score = comb * Math.exp(-0.5 * Math.log2(bpm / 120) ** 2)
    if (score > bestScore) {
      bestScore = score
      best = bpm
      bestPeriodicity = comb
    }
  }
  if (bestScore <= 0) return { bpm: 0, confidence: 0 }

  // Refine within ±2 %: far multiples of the beat pin the period down much
  // more tightly than the first few, and the prior has done its job.
  let fine = best
  let fineScore = -Infinity
  for (let bpm = best * 0.98; bpm <= best * 1.02; bpm += 0.01) {
    const lag = (60 * fps) / bpm
    let comb = 0
    for (let k = 1; k <= FINE; k++) comb += at(k * lag)
    if (comb > fineScore) {
      fineScore = comb
      fine = bpm
    }
  }
  best = fine
  // ~0.25+ for a steady beat, near 0 for free time or noise.
  return { bpm: best, confidence: Math.max(0, Math.min(1, bestPeriodicity * 3)) }
}

/* ---- Key ---- */

const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const KEY_FFT = 8192
const KEY_HOP = 4096

function chroma(samples: Float32Array) {
  const fft = makeFft(KEY_FFT)
  const binHz = RATE / KEY_FFT
  const lo = Math.ceil(55 / binHz)
  const hi = Math.floor(2000 / binHz)
  const classOf = new Int8Array(hi + 1)
  for (let b = lo; b <= hi; b++) classOf[b] = pc(Math.round(69 + 12 * Math.log2((b * binHz) / 440)))
  const total = new Float64Array(12)
  const frame = new Float64Array(12)
  for (let start = 0; start + KEY_FFT <= samples.length; start += KEY_HOP) {
    const mags = fft(samples, start)
    frame.fill(0)
    for (let b = lo; b <= hi; b++) frame[classOf[b]] += mags[b]
    let sum = 0
    for (const v of frame) sum += v
    if (sum < 1e-6) continue
    for (let i = 0; i < 12; i++) total[i] += frame[i] / sum
  }
  return total
}

function correlate(a: ArrayLike<number>, b: number[]) {
  const n = 12
  let ma = 0
  let mb = 0
  for (let i = 0; i < n; i++) {
    ma += a[i]
    mb += b[i]
  }
  ma /= n
  mb /= n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return num / Math.sqrt(da * db || 1)
}

function keys(samples: Float32Array) {
  const c = chroma(samples)
  const out: { tonic: number; minor: boolean; score: number }[] = []
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = Array.from({ length: 12 }, (_, i) => c[pc(i + tonic)])
    out.push({ tonic, minor: false, score: correlate(rotated, MAJOR) })
    out.push({ tonic, minor: true, score: correlate(rotated, MINOR) })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** Analyses mono samples at RATE. */
export function analyze(samples: Float32Array): Analysis {
  // Two minutes from the middle is plenty for the tempo, and skips a free-time intro.
  const span = Math.min(samples.length, 120 * RATE)
  const from = Math.floor((samples.length - span) / 2)
  const { bpm, confidence } = tempo(onsetEnvelope(samples.subarray(from, from + span)))
  const ranked = keys(samples)
  const [first, second] = ranked
  return {
    bpm,
    bpmConfidence: confidence,
    key: { tonic: first.tonic, minor: first.minor },
    keyConfidence: Math.max(0, Math.min(1, (first.score - second.score) * 5 + 0.3 * first.score)),
    keys: ranked.slice(0, 4),
    seconds: samples.length / RATE,
  }
}

/** Decodes any audio (or a video's soundtrack) the browser can play, as mono at RATE. */
export async function decodeToMono(file: File): Promise<Float32Array> {
  const data = await file.arrayBuffer()
  const decoded = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data)
  // Enough for a reliable answer; analysing a 60-minute mix would just take long.
  const seconds = Math.min(decoded.duration, 8 * 60)
  const offline = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}
