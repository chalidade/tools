// Plans and cuts a long video into pieces that fit a WhatsApp Status.
// Pure planning functions up here; the cutting reuses convertMedia (trim).

import { convertMedia, ensureAudioEncoder, NoEncoderError, type MediaInfo } from '@/lib/media'

/** Longest Status clip in seconds. WhatsApp has changed this over time (15 → 30 → 60), so it is a choice. */
export const LIMITS = [15, 30, 60] as const
export type Limit = (typeof LIMITS)[number]

/** WhatsApp refuses media above ~16 MB; stay under it with room for container overhead. */
export const MAX_BYTES = 14 * 1024 * 1024
const AUDIO_BITRATE = 96_000
const MAX_VIDEO_BITRATE = 3_000_000

/** Equal pieces no longer than `limit` seconds: 70 s at 30 → 3 × 23.3 s, never a 1-second leftover. */
export function planSegments(duration: number, limit: number): { start: number; end: number }[] {
  if (!(duration > 0) || !(limit > 0)) return []
  const count = Math.max(1, Math.ceil(duration / limit - 1e-6))
  const size = duration / count
  return Array.from({ length: count }, (_, i) => ({ start: i * size, end: i === count - 1 ? duration : (i + 1) * size }))
}

/** Video bitrate that keeps a piece of `seconds` under MAX_BYTES, capped for quality sanity. */
export function videoBitrateFor(seconds: number, sourceBitrate = 0) {
  const total = (MAX_BYTES * 8) / Math.max(seconds, 1)
  const fit = Math.floor(total - AUDIO_BITRATE)
  const capped = Math.min(fit, MAX_VIDEO_BITRATE)
  return sourceBitrate ? Math.min(capped, Math.round(sourceBitrate * 0.9)) : capped
}

/** Short side 720 px at most (Status is re-compressed by WhatsApp anyway), even dimensions. */
export function statusSize(width: number, height: number) {
  const short = Math.min(width, height)
  const scale = short > 720 ? 720 / short : 1
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}

export async function cutSegment(
  file: File,
  info: MediaInfo,
  range: { start: number; end: number },
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
): Promise<Blob> {
  const v = info.video!
  const { width, height } = statusSize(v.width, v.height)
  const bitrate = videoBitrateFor(range.end - range.start, v.bitrate)
  let audio: Parameters<typeof convertMedia>[0]['audio'] = { discard: true }
  if (info.audio) {
    audio = {}
    if (await ensureAudioEncoder('aac')) audio = { codec: 'aac', bitrate: AUDIO_BITRATE, forceTranscode: true }
  }
  return convertMedia({
    file,
    mimeType: 'video/mp4',
    format: (mb) => new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    trim: range,
    video: async (mb) => {
      const codec = await mb.getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width, height, bitrate })
      if (!codec) throw new NoEncoderError('video')
      return { codec, width, height, fit: 'fill', bitrate, forceTranscode: true }
    },
    audio,
    onProgress,
    onStart,
  })
}
