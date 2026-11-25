// Slideshow timing and framing. Pure maths, shared by the preview and the encoder.

export type RatioId = '9:16' | '1:1' | '16:9'
export const SIZES: Record<RatioId, [number, number]> = { '9:16': [720, 1280], '1:1': [1080, 1080], '16:9': [1280, 720] }

export interface Options {
  /** Seconds each photo stays. */
  seconds: number
  /** Cross-fade length in seconds (0 = hard cut). */
  fade: number
  /** Slow zoom: extra scale reached at the end of a photo (0 = none, 0.12 = 12 %). */
  zoom: number
}

export interface Layer {
  index: number
  alpha: number
  /** Scale on top of "cover". */
  scale: number
}

export const totalSeconds = (count: number, o: Options) => count * o.seconds

/** Fade can never be longer than the photo itself. */
export const effectiveFade = (o: Options) => Math.min(Math.max(0, o.fade), o.seconds * 0.9)

/**
 * What to draw at time `t`: the outgoing photo (full) and, while fading in, the next one on top.
 * A photo keeps zooming while it fades out, so it never freezes.
 */
export function layersAt(t: number, count: number, o: Options): Layer[] {
  const fade = effectiveFade(o)
  const clamped = Math.min(Math.max(0, t), count * o.seconds - 1e-9)
  const i = Math.min(count - 1, Math.floor(clamped / o.seconds))
  const into = clamped - i * o.seconds
  const scaleOf = (k: number) => {
    const span = o.seconds + (k < count - 1 ? fade : 0)
    const u = Math.min(1, Math.max(0, (clamped - k * o.seconds) / span))
    return 1 + o.zoom * u
  }
  if (i > 0 && fade > 0 && into < fade) {
    return [
      { index: i - 1, alpha: 1, scale: scaleOf(i - 1) },
      { index: i, alpha: into / fade, scale: scaleOf(i) },
    ]
  }
  return [{ index: i, alpha: 1, scale: scaleOf(i) }]
}

/** Source rectangle that covers a `cw`×`ch` canvas, zoomed towards the centre. */
export function coverSource(iw: number, ih: number, cw: number, ch: number, scale: number) {
  const base = Math.max(cw / iw, ch / ih)
  const sw = cw / (base * scale)
  const sh = ch / (base * scale)
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh }
}

/** The song laid over the video: start offset, then looped (or not) to `total`. Returns [songTime] for output sample `i`. */
export function songFrame(i: number, startFrame: number, songFrames: number, loop: boolean): number | null {
  const pos = startFrame + i
  if (loop) return songFrames - startFrame > 0 ? startFrame + (i % (songFrames - startFrame)) : null
  return pos < songFrames ? pos : null
}

/** Volume at output time `t` (s): short fade in, fade out over the last second. */
export function gainAt(t: number, total: number) {
  const fin = Math.min(1, t / 0.3)
  const fout = Math.min(1, Math.max(0, (total - t) / Math.min(1, total / 2)))
  return Math.max(0, Math.min(fin, fout))
}
