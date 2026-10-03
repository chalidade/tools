// Video compression on top of src/lib/media.ts: scale down, re-encode at a
// bitrate derived from the output's pixel rate, and keep (or drop) the audio.

import { convertMedia, ensureAudioEncoder, NoEncoderError, type MediaInfo } from '@/lib/media'

export type Level = 'light' | 'medium' | 'strong'
/** Target short side in pixels; 0 keeps the original size. */
export type Resolution = 0 | 1080 | 720 | 480

/** Bits per pixel per frame. Phone cameras record ~0.25; streaming services sit ~0.05–0.1. */
const BITS_PER_PIXEL: Record<Level, number> = { light: 0.1, medium: 0.06, strong: 0.035 }

/** Output size for a target short side, keeping the aspect ratio and even dimensions (encoders need them). */
export function targetSize(width: number, height: number, resolution: Resolution) {
  const short = Math.min(width, height)
  const scale = resolution && resolution < short ? resolution / short : 1
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}

export function targetBitrate(info: MediaInfo, level: Level, resolution: Resolution) {
  const v = info.video!
  const { width, height } = targetSize(v.width, v.height, resolution)
  const fps = Math.min(v.fps || 30, level === 'strong' ? 30 : 60)
  const bitrate = Math.round(width * height * fps * BITS_PER_PIXEL[level])
  // Never ask for more than the source already uses — that only grows the file.
  return v.bitrate ? Math.min(bitrate, Math.round(v.bitrate * 0.85)) : bitrate
}

/** MP4 can carry these audio codecs as they are; anything else is re-encoded to AAC. */
const MP4_AUDIO = ['aac', 'mp3', 'opus']

export async function compressVideo(
  file: File,
  info: MediaInfo,
  opts: { level: Level; resolution: Resolution; keepAudio: boolean },
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const v = info.video!
  const { width, height } = targetSize(v.width, v.height, opts.resolution)
  const bitrate = targetBitrate(info, opts.level, opts.resolution)

  let audio: Parameters<typeof convertMedia>[0]['audio'] = { discard: true }
  if (opts.keepAudio && info.audio) {
    const reencode = opts.level === 'strong' || !MP4_AUDIO.includes(info.audio.codec ?? '')
    audio = {}
    if (reencode && (await ensureAudioEncoder('aac')))
      audio = { codec: 'aac', bitrate: opts.level === 'strong' ? 96_000 : 128_000 }
  }

  return convertMedia({
    file,
    mimeType: 'video/mp4',
    // fastStart: the index goes at the front, so the video can play before it fully loads.
    format: (mb) => new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
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
        frameRate: opts.level === 'strong' && v.fps > 31 ? 30 : undefined,
        forceTranscode: true,
      }
    },
    audio,
    onProgress,
    onStart,
  })
}
