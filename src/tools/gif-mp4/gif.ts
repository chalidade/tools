// GIF ⇄ MP4 in the visitor's browser. GIF frames are decoded with gifuct-js
// and encoded to H.264 with Mediabunny (WebCodecs); video frames are drawn
// with Mediabunny's CanvasSink and written as a GIF with gifenc. Nothing is
// uploaded; the libraries load only when this tool is opened.

import { NoEncoderError, openMedia } from '@/lib/media'

export const isGif = (file: File) => file.type === 'image/gif' || /\.gif$/i.test(file.name)

export interface GifInfo {
  width: number
  height: number
  frames: number
  /** Seconds, one loop. */
  duration: number
}

async function parse(file: File) {
  const { parseGIF, decompressFrame } = await import('gifuct-js')
  const gif = parseGIF(await file.arrayBuffer())
  // Only image frames; application/comment blocks are skipped.
  const frames = gif.frames.filter((f) => 'image' in f)
  return { gif, frames, decompressFrame }
}

/** Browsers show a delay of 0–10 ms as 100 ms; match them so the video plays at the same pace. */
const frameDelay = (ms: number) => (ms <= 10 ? 100 : ms)

export async function readGifInfo(file: File): Promise<GifInfo> {
  const { gif, frames, decompressFrame } = await parse(file)
  let duration = 0
  for (const f of frames) duration += frameDelay(decompressFrame(f as never, gif.gct, false).delay)
  return { width: gif.lsd.width, height: gif.lsd.height, frames: frames.length, duration: duration / 1000 }
}

/**
 * GIF → MP4. Frames are composited the way browsers do it (each frame
 * patches the previous one, honouring its disposal), over `background`
 * since MP4 has no transparency. `loops` repeats the animation, because
 * many apps refuse videos shorter than a few seconds.
 */
export async function gifToMp4(
  file: File,
  opts: { background: string; loops: number },
  onProgress: (p: number) => void,
): Promise<Blob> {
  const { gif, frames, decompressFrame } = await parse(file)
  const W = gif.lsd.width
  const H = gif.lsd.height
  // H.264 needs even dimensions.
  const outW = W + (W % 2)
  const outH = H + (H % 2)

  const mb = await import('mediabunny')
  const codec = await mb.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1', 'hevc'], { width: outW, height: outH })
  if (!codec) throw new NoEncoderError('video')

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  const layer = document.createElement('canvas') // the GIF's own picture, with transparency
  layer.width = W
  layer.height = H
  const lctx = layer.getContext('2d', { willReadFrequently: true })!

  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
  const source = new mb.CanvasSource(canvas, { codec, bitrate: mb.QUALITY_HIGH, keyFrameInterval: 2 })
  output.addVideoTrack(source)
  await output.start()

  let t = 0
  const total = frames.length * opts.loops
  for (let loop = 0; loop < opts.loops; loop++) {
    lctx.clearRect(0, 0, W, H)
    let restore: ImageData | null = null
    let previous: { dims: { left: number; top: number; width: number; height: number }; disposalType: number } | null = null
    for (const [i, raw] of frames.entries()) {
      const frame = decompressFrame(raw as never, gif.gct, true)
      // Undo the previous frame as its disposal method says.
      if (previous?.disposalType === 2) lctx.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height)
      else if (previous?.disposalType === 3 && restore) lctx.putImageData(restore, 0, 0)
      restore = frame.disposalType === 3 ? lctx.getImageData(0, 0, W, H) : null

      // Draw the patch, leaving transparent pixels showing what is underneath.
      const { left, top, width, height } = frame.dims
      const under = lctx.getImageData(left, top, width, height)
      const patch = frame.patch
      for (let p = 0; p < patch.length; p += 4) {
        if (patch[p + 3] === 0) continue
        under.data[p] = patch[p]
        under.data[p + 1] = patch[p + 1]
        under.data[p + 2] = patch[p + 2]
        under.data[p + 3] = 255
      }
      lctx.putImageData(under, left, top)
      previous = frame

      ctx.fillStyle = opts.background
      ctx.fillRect(0, 0, outW, outH)
      ctx.drawImage(layer, 0, 0)
      const d = frameDelay(frame.delay) / 1000
      await source.add(t, d)
      t += d
      onProgress((loop * frames.length + i + 1) / total)
    }
  }
  source.close()
  await output.finalize()
  return new Blob([output.target.buffer!], { type: 'video/mp4' })
}

/**
 * Video → GIF: frames at `fps` between start and end, `width` px wide, each
 * with its own 256-colour palette (sharper than one palette for the whole clip).
 */
export async function videoToGif(
  file: File,
  opts: { start: number; end: number; fps: number; width: number },
  onProgress: (p: number) => void,
  isCanceled: () => boolean,
): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const { mb, input } = await openMedia(file)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error('no video')
    const sink = new mb.CanvasSink(track, { width: opts.width, poolSize: 1 })
    const count = Math.max(1, Math.round((opts.end - opts.start) * opts.fps))
    const times = Array.from({ length: count }, (_, i) => opts.start + i / opts.fps)
    const encoder = GIFEncoder()
    // GIF delays are whole hundredths of a second: 1000/12 ms would round to 80 ms and
    // play 4% fast. Round the running total instead, so frames alternate 80/90 ms.
    const delayOf = (n: number) => Math.round(((n + 1) * 100) / opts.fps) * 10 - Math.round((n * 100) / opts.fps) * 10
    let i = 0
    for await (const frame of sink.canvasesAtTimestamps(times)) {
      if (isCanceled()) throw new Error('canceled')
      if (!frame) continue
      const c = frame.canvas as HTMLCanvasElement
      const data = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data
      const palette = quantize(data, 256)
      encoder.writeFrame(applyPalette(data, palette), c.width, c.height, { palette, delay: delayOf(i), repeat: 0 })
      onProgress(++i / count)
    }
    encoder.finish()
    return new Blob([encoder.bytesView() as BlobPart], { type: 'image/gif' })
  } finally {
    input.dispose()
  }
}
