// Video frames as images, in the visitor's browser: Mediabunny decodes the
// exact frame at each time (full resolution, rotation applied) onto a canvas.

import { canvasBlob } from '@/lib/image'
import { openMedia } from '@/lib/media'

export type FrameFormat = 'png' | 'jpeg' | 'webp'
export const FRAME_EXT: Record<FrameFormat, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' }

export interface Frame {
  id: string
  /** Seconds. */
  time: number
  format: FrameFormat
  blob: Blob
  url: string
}

/** Times every `step` seconds from 0, or `count` times spread evenly. */
export function plannedTimes(duration: number, mode: 'every' | 'count', value: number) {
  if (mode === 'every') {
    const step = Math.max(0.04, value)
    return Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step).filter((t) => t < duration)
  }
  const n = Math.max(1, Math.round(value))
  // Centres of n equal parts, so the first and last frames are not black fade-ins.
  return Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * duration)
}

export async function captureFrames(
  file: File,
  times: number[],
  format: FrameFormat,
  onFrame: (frame: Frame) => void,
  onProgress: (done: number, total: number) => void,
  isCanceled: () => boolean,
) {
  const { mb, input } = await openMedia(file)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error('no video')
    const sink = new mb.CanvasSink(track, { poolSize: 1 })
    const sorted = [...times].sort((a, b) => a - b)
    let i = 0
    for await (const frame of sink.canvasesAtTimestamps(sorted)) {
      if (isCanceled()) break
      const time = sorted[i++]
      if (frame) {
        const blob = await canvasBlob(frame.canvas as HTMLCanvasElement, `image/${format}`, 0.92)
        onFrame({ id: crypto.randomUUID(), time, format, blob, url: URL.createObjectURL(blob) })
      }
      onProgress(i, sorted.length)
    }
  } finally {
    input.dispose()
  }
}

/** "video-0m12.50s.png" — sortable and readable. */
export function frameName(base: string, frame: Frame) {
  const m = Math.floor(frame.time / 60)
  const s = (frame.time % 60).toFixed(2).padStart(5, '0')
  return `${base}-${m}m${s}s.${FRAME_EXT[frame.format]}`
}

export async function zipFrames(frames: Frame[], base: string) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const f of frames) zip.file(frameName(base, f), f.blob, { compression: 'STORE' })
  return zip.generateAsync({ type: 'blob' })
}
