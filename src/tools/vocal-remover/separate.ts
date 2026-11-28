// Splits a stereo song at 44.1 kHz into stems with SCNet: the song is
// normalized, cut into 11 s segments that overlap (each weighted by a window
// that fades in and out over a tenth of it, as Music-Source-Separation-
// Training's demix() does), each segment's STFT goes through the model, and
// the stems' iSTFTs are added back under the same windows. No DOM here: this
// runs in the worker (and in Node for checking against PyTorch).

import { BINS, frameCount, istftPair, stft } from './stft'

export const RATE = 44100
/** The model's segment: 11 s, padded to a whole, even number of hops (486400 samples, 476 frames). */
export const SEGMENT = 485100
const PADDED = 486400
const FRAMES = frameCount(PADDED)
export const SOURCES = ['drums', 'bass', 'other', 'vocals'] as const
export type Source = (typeof SOURCES)[number]

/** Runs the model on one segment's spectrum [1, 4, BINS, FRAMES] → [1, 16, BINS, FRAMES]. */
export type RunModel = (spec: Float32Array, dims: number[]) => Promise<Float32Array>

export interface SeparateOptions {
  /** Each sample is heard in this many segments: 2 is faster, 4 a little cleaner. */
  overlap: number
  /** Only vocals (and the instrumental as the mix less them), or all four stems. */
  sources: readonly Source[]
  onProgress?: (done: number, total: number) => void
  signal?: { cancelled: boolean }
}

export class CancelledError extends Error {}

/** Segment start positions: every `step`, the last one ending at the end. */
export function segmentStarts(length: number, step: number) {
  if (length <= SEGMENT) return [0]
  const starts: number[] = []
  for (let s = 0; s + SEGMENT < length; s += step) starts.push(s)
  starts.push(length - SEGMENT)
  return starts
}

function windowFor(first: boolean, last: boolean) {
  const w = new Float32Array(SEGMENT).fill(1)
  const fade = Math.floor(SEGMENT / 10)
  for (let i = 0; i < fade; i++) {
    const up = i / (fade - 1)
    if (!first) w[i] = up
    if (!last) w[SEGMENT - 1 - i] = up
  }
  return w
}

/** Returns each asked source's [left, right] at the input's length. */
export async function separate(left: Float32Array, right: Float32Array, run: RunModel, opts: SeparateOptions) {
  const length = left.length
  // Normalize by the mono mix's mean and deviation; the stems are scaled back (the mean goes to none of them).
  let sum = 0
  for (let i = 0; i < length; i++) sum += left[i] + right[i]
  const mean = sum / (2 * length)
  let sq = 0
  for (let i = 0; i < length; i++) {
    const m = (left[i] + right[i]) / 2 - mean
    sq += m * m
  }
  const std = Math.sqrt(sq / Math.max(1, length - 1)) || 1

  const picked = opts.sources.map((s) => SOURCES.indexOf(s))
  const acc = picked.map(() => [new Float32Array(length), new Float32Array(length)])
  const weight = new Float32Array(length)
  const starts = segmentStarts(length, Math.floor(SEGMENT / opts.overlap))

  const segL = new Float32Array(PADDED)
  const segR = new Float32Array(PADDED)
  const spec = new Float32Array(4 * BINS * FRAMES)
  const plane = BINS * FRAMES

  for (const [n, start] of starts.entries()) {
    if (opts.signal?.cancelled) throw new CancelledError()
    segL.fill(0)
    segR.fill(0)
    const count = Math.min(SEGMENT, length - start)
    for (let i = 0; i < count; i++) {
      segL[i] = (left[start + i] - mean) / std
      segR[i] = (right[start + i] - mean) / std
    }
    stft(segL, segR, spec, FRAMES)
    const out = await run(spec, [1, 4, BINS, FRAMES])
    const w = windowFor(n === 0, n === starts.length - 1)
    picked.forEach((s, j) => {
      // channels: (source · 2 + channel) · 2 + (re, im)
      const l = (s * 2) * 2 * plane
      const r = (s * 2 + 1) * 2 * plane
      const [al, ar] = acc[j]
      istftPair(out, { re: l, im: l + plane }, { re: r, im: r + plane }, FRAMES, count, (i, x, y) => {
        al[start + i] += x * std * w[i]
        ar[start + i] += y * std * w[i]
      })
    })
    for (let i = 0; i < count; i++) weight[start + i] += w[i]
    opts.onProgress?.(n + 1, starts.length)
  }
  for (const [al, ar] of acc)
    for (let i = 0; i < length; i++) {
      const k = weight[i] > 0 ? 1 / weight[i] : 0
      al[i] *= k
      ar[i] *= k
    }
  return Object.fromEntries(opts.sources.map((s, j) => [s, acc[j]])) as Record<Source, [Float32Array, Float32Array]>
}
