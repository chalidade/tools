// Video compression on top of src/lib/media.ts: scale down, re-encode at a
// bitrate derived from the output's pixel rate, and keep (or drop) the audio.

import {
  canWriteToDisk,
  convertMedia,
  ensureAudioEncoder,
  freeStorage,
  NoEncoderError,
  openDiskOutput,
  type MediaInfo,
} from '@/lib/media'

export type Level = 'light' | 'medium' | 'strong'
/** Target short side in pixels; 0 keeps the original size. */
export type Resolution = 0 | 1080 | 720 | 480
/** Output frame rate; 0 keeps the original. */
export type FrameRate = 0 | 30 | 24 | 15

/** Bits per pixel per frame. Phone cameras record ~0.25; streaming services sit ~0.05–0.1. */
const BITS_PER_PIXEL: Record<Level, number> = { light: 0.1, medium: 0.06, strong: 0.035 }

/** Output size for a target short side, keeping the aspect ratio and even dimensions (encoders need them). */
export function targetSize(width: number, height: number, resolution: Resolution) {
  const short = Math.min(width, height)
  const scale = resolution && resolution < short ? resolution / short : 1
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}

/** Whether `fps` actually lowers this video's frame rate (29.97 → 30 does not). */
export const lowersFps = (sourceFps: number, fps: FrameRate) => fps > 0 && fps < sourceFps - 0.5

/** The frame rate the output will have: the chosen one, never above the source's. */
export function targetFps(info: MediaInfo, fps: FrameRate = 0) {
  const source = info.video!.fps || 30
  return lowersFps(source, fps) ? fps : source
}

export function targetBitrate(info: MediaInfo, level: Level, resolution: Resolution, frameRate: FrameRate = 0) {
  const v = info.video!
  const { width, height } = targetSize(v.width, v.height, resolution)
  const fps = Math.min(targetFps(info, frameRate), 60)
  const bitrate = Math.round(width * height * fps * BITS_PER_PIXEL[level])
  // Never ask for more than the source already uses — that only grows the file.
  return v.bitrate ? Math.min(bitrate, Math.round(v.bitrate * 0.85)) : bitrate
}

/** Audio bitrate the output will use, for the size estimate. */
export function audioBitrate(info: MediaInfo, level: Level, keepAudio: boolean) {
  if (!keepAudio || !info.audio) return 0
  return level === 'strong' ? 96_000 : Math.min(info.audio.bitrate || 128_000, 192_000)
}

/** Expected output size in bytes. */
export function estimateSize(info: MediaInfo, opts: Options) {
  const bits = targetBitrate(info, opts.level, opts.resolution, opts.fps) + audioBitrate(info, opts.level, opts.keepAudio)
  return (bits * info.duration) / 8
}

/**
 * Above this the output is streamed to disk rather than kept in memory: a tab
 * holding a ~1 GB+ buffer (plus the encoded chunks while it is built) is close
 * to what browsers allow, and past 2 GB it fails outright.
 */
const MEMORY_LIMIT = 700 * 1024 * 1024

/** Thrown when the output is too big for memory and this browser cannot write it to disk. */
export class TooBigError extends Error {
  readonly reason: 'no-disk' | 'no-space'
  constructor(reason: 'no-disk' | 'no-space') {
    super(reason)
    this.reason = reason
  }
}

/** Whether a job of this size can run here at all, checked before starting. */
export function sizeProblem(estimate: number): TooBigError['reason'] | null {
  return estimate > MEMORY_LIMIT && !canWriteToDisk() ? 'no-disk' : null
}

export interface Options {
  level: Level
  resolution: Resolution
  /** Defaults to 0, the original frame rate. */
  fps?: FrameRate
  keepAudio: boolean
}

/** MP4 can carry these audio codecs as they are; anything else is re-encoded to AAC. */
const MP4_AUDIO = ['aac', 'mp3', 'opus']

export async function compressVideo(
  file: File,
  info: MediaInfo,
  opts: Options,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const v = info.video!
  const { width, height } = targetSize(v.width, v.height, opts.resolution)
  const bitrate = targetBitrate(info, opts.level, opts.resolution, opts.fps)
  const estimate = estimateSize(info, opts)

  let audio: Parameters<typeof convertMedia>[0]['audio'] = { discard: true }
  if (opts.keepAudio && info.audio) {
    const reencode = opts.level === 'strong' || !MP4_AUDIO.includes(info.audio.codec ?? '')
    audio = {}
    if (reencode && (await ensureAudioEncoder('aac')))
      audio = { codec: 'aac', bitrate: opts.level === 'strong' ? 96_000 : 128_000 }
  }

  // Big outputs go to a file on disk; a buffer that size would crash the tab.
  let disk = null
  if (estimate > MEMORY_LIMIT) {
    const free = await freeStorage()
    // Encoders overshoot the target a little; leave room for that.
    if (free !== null && free < estimate * 1.3) throw new TooBigError('no-space')
    disk = await openDiskOutput('compressed.mp4')
    if (!disk) throw new TooBigError('no-disk')
  }

  return convertMedia({
    file,
    mimeType: 'video/mp4',
    disk,
    // In memory the index goes at the front (Fast Start), so the video can play before it fully loads.
    // Streaming to disk puts it at the end: Fast Start would keep every chunk in memory again.
    format: (mb, toDisk) => new mb.Mp4OutputFormat({ fastStart: toDisk ? false : 'in-memory' }),
    video: async (mb) => {
      // H.264 first: it plays everywhere. Then whatever this browser can encode.
      const codec = await mb.getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width, height, bitrate })
      if (!codec) throw new NoEncoderError('video')
      return {
        codec,
        width,
        height,
        fit: 'fill',
        bitrate,
        frameRate: lowersFps(v.fps, opts.fps ?? 0) ? opts.fps : undefined,
        forceTranscode: true,
      }
    },
    audio,
    onProgress,
    onStart,
  })
}
