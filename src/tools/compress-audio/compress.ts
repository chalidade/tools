// Audio compression on top of src/lib/media.ts. Also takes video files and
// keeps only their sound, so it doubles as "extract audio from video".

import type { AudioCodec } from 'mediabunny'
import { convertMedia, ensureAudioEncoder } from '@/lib/media'

export type AudioFormat = 'mp3' | 'm4a' | 'opus'

export const FORMATS: Record<AudioFormat, { codec: AudioCodec; ext: string; mime: string; label: string }> = {
  mp3: { codec: 'mp3', ext: 'mp3', mime: 'audio/mpeg', label: 'MP3' },
  m4a: { codec: 'aac', ext: 'm4a', mime: 'audio/mp4', label: 'AAC (M4A)' },
  opus: { codec: 'opus', ext: 'ogg', mime: 'audio/ogg', label: 'Opus (OGG)' },
}

/**
 * Which formats this browser can produce. MP3 and AAC always work — a wasm
 * encoder steps in when there is no native one, and it is only loaded when
 * actually used. Opus needs the browser's own encoder.
 */
export async function availableFormats(): Promise<AudioFormat[]> {
  const { canEncodeAudio } = await import('mediabunny')
  return (await canEncodeAudio('opus')) ? ['mp3', 'm4a', 'opus'] : ['mp3', 'm4a']
}

export async function compressAudio(
  file: File,
  opts: { format: AudioFormat; bitrate: number; mono: boolean },
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const f = FORMATS[opts.format]
  await ensureAudioEncoder(f.codec)
  return convertMedia({
    file,
    mimeType: f.mime,
    format: (mb) =>
      opts.format === 'mp3'
        ? new mb.Mp3OutputFormat()
        : opts.format === 'm4a'
          ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' })
          : new mb.OggOutputFormat(),
    video: { discard: true },
    audio: {
      codec: f.codec,
      bitrate: opts.bitrate,
      numberOfChannels: opts.mono ? 1 : undefined,
      // Opus only runs at 48 kHz; the others keep the source rate.
      sampleRate: opts.format === 'opus' ? 48_000 : undefined,
      forceTranscode: true,
    },
    onProgress,
    onStart,
  })
}
