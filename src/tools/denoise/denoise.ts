// Removes background noise from the audio of a video or audio file, in the
// visitor's browser. The audio is resampled to 48 kHz (what RNNoise expects),
// cleaned channel by channel, and re-encoded; a video's picture is copied
// over untouched when the MP4 container can hold it. Built on src/lib/media.ts.

import type { AudioSample } from 'mediabunny'
import { AUDIO_OUTPUTS, convertMedia, ensureAudioEncoder, NoEncoderError, type AudioOut, type MediaInfo } from '@/lib/media'
import { Denoiser, loadRnnoise, RATE, rnnoiseChannels } from './rnnoise'

export interface DenoiseOptions {
  /** 0–1: how much of the cleaned signal replaces the original. */
  strength: number
  /** Output for audio-only files. */
  audioOut: AudioOut
}

export function outputFor(info: MediaInfo, opts: DenoiseOptions) {
  return info.video
    ? { ext: 'mp4', mimeType: 'video/mp4' }
    : { ext: AUDIO_OUTPUTS[opts.audioOut].ext, mimeType: AUDIO_OUTPUTS[opts.audioOut].mimeType }
}

export async function denoiseMedia(
  file: File,
  info: MediaInfo,
  opts: DenoiseOptions,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const [mb, mod] = await Promise.all([import('mediabunny'), loadRnnoise()])
  const audioCodec = info.video ? 'aac' : AUDIO_OUTPUTS[opts.audioOut].codec
  if (audioCodec && !(await ensureAudioEncoder(audioCodec))) throw new NoEncoderError('audio')

  let rn: ReturnType<typeof rnnoiseChannels> | null = null
  let den: Denoiser | null = null
  let start = 0
  let written = 0
  let flushed = false

  const process = (sample: AudioSample) => {
    const channels = sample.numberOfChannels
    if (!den) {
      rn = rnnoiseChannels(mod, channels)
      den = new Denoiser(channels, rn.process, opts.strength)
      start = sample.timestamp
    }
    const planes = Array.from({ length: channels }, (_, c) => {
      const plane = new Float32Array(sample.numberOfFrames)
      sample.copyTo(plane, { planeIndex: c, format: 'f32-planar' })
      return plane
    })
    let out = den.push(planes)
    // The last chunk: also emit what the denoiser still holds.
    if (!flushed && sample.timestamp + sample.duration >= info.duration - 0.02) {
      flushed = true
      const rest = den.flush()
      out = out.map((p, c) => {
        const all = new Float32Array(p.length + rest[c].length)
        all.set(p)
        all.set(rest[c], p.length)
        return all
      })
    }
    const n = out[0]?.length ?? 0
    if (!n) return []
    const data = new Float32Array(n * channels)
    out.forEach((p, c) => data.set(p, c * n))
    const result = new mb.AudioSample({ data, format: 'f32-planar', numberOfChannels: channels, sampleRate: RATE, timestamp: start + written / RATE })
    written += n
    return result
  }

  try {
    return await convertMedia({
      file,
      mimeType: outputFor(info, opts).mimeType,
      format: info.video ? (m) => new m.Mp4OutputFormat({ fastStart: 'in-memory' }) : AUDIO_OUTPUTS[opts.audioOut].format,
      // No video options: the picture is copied as is (re-encoded only if MP4 cannot hold its codec).
      audio: {
        codec: audioCodec ?? 'pcm-s16',
        bitrate: audioCodec ? 160_000 : undefined,
        forceTranscode: true,
        sampleRate: RATE,
        process,
      },
      onProgress,
      onStart,
    })
  } finally {
    ;(rn as ReturnType<typeof rnnoiseChannels> | null)?.destroy()
  }
}
