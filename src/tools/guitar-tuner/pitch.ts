/*
 * Pitch detection for the tuner: the McLeod Pitch Method (normalised square
 * difference function + "first peak above k × highest peak"), which picks the
 * fundamental of a plucked string instead of its louder second harmonic.
 */

export interface Pitch {
  /** Fundamental frequency in Hz. */
  freq: number
  /** 0–1: how periodic the signal is. Below ~0.85 it is noise or a decaying tail. */
  clarity: number
}

/**
 * Detects the pitch of `buf` (time-domain samples), searching only between
 * `minFreq` and `maxFreq`. Returns null for silence or a non-periodic signal.
 */
export function detectPitch(input: Float32Array, rate: number, minFreq: number, maxFreq: number): Pitch | null {
  // The search is O(lags × window), so average down to ~8 samples per period
  // of the highest note first: up to 16× less work, same accuracy.
  const factor = Math.max(1, Math.min(4, Math.floor(rate / (maxFreq * 8))))
  const buf = factor === 1 ? input : decimate(input, factor)
  const sampleRate = rate / factor
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / buf.length)
  if (rms < 0.008) return null

  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq))
  const maxLag = Math.min(Math.floor(sampleRate / minFreq), (buf.length >> 1) - 2)
  const w = buf.length - maxLag - 1
  const nsdf = new Float32Array(maxLag + 2)
  for (let lag = 0; lag <= maxLag + 1; lag++) {
    let acf = 0
    let energy = 0
    for (let i = 0; i < w; i++) {
      const a = buf[i]
      const b = buf[i + lag]
      acf += a * b
      energy += a * a + b * b
    }
    nsdf[lag] = energy > 0 ? (2 * acf) / energy : 0
  }

  // Key maxima: the highest point of each positive lobe after the first
  // negative-going zero crossing.
  const peaks: number[] = []
  let lag = 1
  while (lag < maxLag && nsdf[lag] > 0) lag++
  let best = -1
  for (; lag <= maxLag; lag++) {
    if (nsdf[lag] > 0 && nsdf[lag - 1] <= 0) best = -1
    if (nsdf[lag] > 0 && (best < 0 || nsdf[lag] > nsdf[best])) best = lag
    if (nsdf[lag] <= 0 && nsdf[lag - 1] > 0 && best >= 0) {
      peaks.push(best)
      best = -1
    }
  }
  if (best >= 0) peaks.push(best)
  const usable = peaks.filter((p) => p >= minLag)
  if (usable.length === 0) return null

  const highest = Math.max(...usable.map((p) => nsdf[p]))
  const pick = usable.find((p) => nsdf[p] >= 0.9 * highest)!

  // Parabolic interpolation for a sub-sample lag.
  const y0 = nsdf[pick - 1]
  const y1 = nsdf[pick]
  const y2 = nsdf[pick + 1] ?? y1
  const denom = y0 - 2 * y1 + y2
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0
  const clarity = y1 - 0.25 * (y0 - y2) * shift

  return { freq: sampleRate / (pick + shift), clarity: Math.min(1, clarity) }
}

function decimate(input: Float32Array, factor: number) {
  const out = new Float32Array(Math.floor(input.length / factor))
  for (let i = 0; i < out.length; i++) {
    let sum = 0
    for (let j = 0; j < factor; j++) sum += input[i * factor + j]
    out[i] = sum / factor
  }
  return out
}

export interface Tuning {
  id: string
  label: readonly [string, string]
  /** MIDI notes, lowest string first. Empty = chromatic (any note). */
  strings: number[]
}

export const TUNINGS: Tuning[] = [
  { id: 'standard', label: ['Gitar · Standar', 'Guitar · Standard'], strings: [40, 45, 50, 55, 59, 64] },
  { id: 'drop-d', label: ['Gitar · Drop D', 'Guitar · Drop D'], strings: [38, 45, 50, 55, 59, 64] },
  { id: 'half-down', label: ['Gitar · Turun ½ nada', 'Guitar · Half step down'], strings: [39, 44, 49, 54, 58, 63] },
  { id: 'dadgad', label: ['Gitar · DADGAD', 'Guitar · DADGAD'], strings: [38, 45, 50, 55, 57, 62] },
  { id: 'open-g', label: ['Gitar · Open G', 'Guitar · Open G'], strings: [38, 43, 50, 55, 59, 62] },
  { id: 'bass', label: ['Bass 4 senar', '4-string bass'], strings: [28, 33, 38, 43] },
  { id: 'ukulele', label: ['Ukulele', 'Ukulele'], strings: [67, 60, 64, 69] },
  { id: 'chromatic', label: ['Kromatik (semua nada)', 'Chromatic (any note)'], strings: [] },
]
