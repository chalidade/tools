import type { DecodedImage } from '@/lib/image'
import { ensureAudioEncoder, NoEncoderError } from '@/lib/media'
import { coverSource, gainAt, layersAt, SIZES, songFrame, totalSeconds, type Options, type RatioId } from './timeline'

export interface SlideshowJob extends Options {
  photos: DecodedImage[]
  ratio: RatioId
  fps: number
  music: { file: File; start: number; loop: boolean } | null
}

export function drawFrame(ctx: CanvasRenderingContext2D, photos: DecodedImage[], t: number, o: Options, w: number, h: number) {
  ctx.globalAlpha = 1
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  for (const l of layersAt(t, photos.length, o)) {
    const p = photos[l.index]
    const s = coverSource(p.width, p.height, w, h, l.scale)
    ctx.globalAlpha = l.alpha
    ctx.drawImage(p.source, s.sx, s.sy, s.sw, s.sh, 0, 0, w, h)
  }
  ctx.globalAlpha = 1
}

/** Reads a song into one AudioBuffer (the whole file; songs are a few MB). */
export async function decodeSong(file: File) {
  const ctx = new OfflineAudioContext(2, 1, 44100)
  return ctx.decodeAudioData(await file.arrayBuffer())
}

/** The song's length in seconds, or null if the browser cannot read it. */
export async function songLength(file: File) {
  try {
    return (await decodeSong(file)).duration
  } catch {
    return null
  }
}

function songTrack(song: AudioBuffer, start: number, loop: boolean, total: number) {
  const rate = song.sampleRate
  const frames = Math.round(total * rate)
  const out = new AudioBuffer({ length: frames, numberOfChannels: 2, sampleRate: rate })
  const startFrame = Math.min(song.length - 1, Math.round(start * rate))
  for (let c = 0; c < 2; c++) {
    const src = song.getChannelData(Math.min(c, song.numberOfChannels - 1))
    const dst = out.getChannelData(c)
    for (let i = 0; i < frames; i++) {
      const k = songFrame(i, startFrame, song.length, loop)
      if (k === null) break
      dst[i] = src[k] * gainAt(i / rate, total)
    }
  }
  return out
}

export async function makeSlideshow(job: SlideshowJob, onProgress: (p: number) => void, isCanceled: () => boolean): Promise<Blob> {
  const mb = await import('mediabunny')
  const [w, h] = SIZES[job.ratio]
  const codec = await mb.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width: w, height: h })
  if (!codec) throw new NoEncoderError('video')
  if (job.music && !(await ensureAudioEncoder('aac'))) throw new NoEncoderError('audio')

  const total = totalSeconds(job.photos.length, job)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
  const video = new mb.CanvasSource(canvas, { codec, bitrate: mb.QUALITY_HIGH, keyFrameInterval: 2 })
  output.addVideoTrack(video, { frameRate: job.fps })
  let audio: InstanceType<typeof mb.AudioBufferSource> | null = null
  let track: AudioBuffer | null = null
  if (job.music) {
    track = songTrack(await decodeSong(job.music.file), job.music.start, job.music.loop, total)
    audio = new mb.AudioBufferSource({ codec: 'aac', bitrate: 160_000 })
    output.addAudioTrack(audio)
  }
  await output.start()

  const frames = Math.round(total * job.fps)
  for (let i = 0; i < frames; i++) {
    if (isCanceled()) {
      await output.cancel()
      throw new Error('canceled')
    }
    drawFrame(ctx, job.photos, i / job.fps, job, w, h)
    await video.add(i / job.fps, 1 / job.fps)
    onProgress(((i + 1) / frames) * (track ? 0.9 : 1))
  }
  video.close()
  if (audio && track) {
    // One second at a time so the encoder's queue never balloons.
    const rate = track.sampleRate
    for (let at = 0; at < track.length; at += rate) {
      const n = Math.min(rate, track.length - at)
      const part = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: rate })
      for (let c = 0; c < 2; c++) part.copyToChannel(track.getChannelData(c).subarray(at, at + n), c)
      await audio.add(part)
    }
    audio.close()
  }
  await output.finalize()
  onProgress(1)
  return new Blob([output.target.buffer!], { type: 'video/mp4' })
}
