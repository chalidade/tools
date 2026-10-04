// Speed up or slow down a video or audio file in the visitor's browser.
// Video frames are re-timed (and thinned out when sped up, so the frame rate
// stays the same); audio goes through a time-stretch that keeps the pitch,
// or a plain resample that shifts it. Built on src/lib/media.ts.

import type { AudioSample, ConversionAudioOptions } from 'mediabunny'
import {
  AUDIO_OUTPUTS,
  convertMedia,
  ensureAudioEncoder,
  NoEncoderError,
  type AudioOut,
  type MediaInfo,
} from '@/lib/media'
import { Resample, TimeStretch, type SpeedProcessor } from './stretch'

export interface SpeedOptions {
  speed: number
  keepPitch: boolean
  keepAudio: boolean
  /** Output for audio-only files. */
  audioOut: AudioOut
}

function join(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

/** The audio `process` hook: decoded chunks in, re-timed chunks out, timestamps laid end to end. */
function audioProcess(mb: typeof import('mediabunny'), speed: number, keepPitch: boolean, endsAt: number) {
  let proc: SpeedProcessor | null = null
  let written = 0
  let flushed = false
  return (sample: AudioSample) => {
    const channels = sample.numberOfChannels
    const rate = sample.sampleRate
    proc ??= keepPitch ? new TimeStretch(channels, rate, speed) : new Resample(channels, speed)
    const planes = Array.from({ length: channels }, (_, c) => {
      const plane = new Float32Array(sample.numberOfFrames)
      sample.copyTo(plane, { planeIndex: c, format: 'f32-planar' })
      return plane
    })
    let out = proc.push(planes)
    // The last chunk: also emit what the processor still holds.
    if (!flushed && sample.timestamp + sample.duration >= endsAt - 0.02) {
      flushed = true
      const rest = proc.flush()
      out = out.map((p, c) => join(p, rest[c]))
    }
    const n = out[0]?.length ?? 0
    if (!n) return []
    const data = new Float32Array(n * channels)
    out.forEach((p, c) => data.set(p, c * n))
    const result = new mb.AudioSample({ data, format: 'f32-planar', numberOfChannels: channels, sampleRate: rate, timestamp: written / rate })
    written += n
    return result
  }
}

export function outputFor(info: MediaInfo, opts: SpeedOptions) {
  return info.video
    ? { ext: 'mp4', mimeType: 'video/mp4' }
    : { ext: AUDIO_OUTPUTS[opts.audioOut].ext, mimeType: AUDIO_OUTPUTS[opts.audioOut].mimeType }
}

export async function changeSpeed(
  file: File,
  info: MediaInfo,
  opts: SpeedOptions,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const mb = await import('mediabunny')
  const { speed } = opts
  const audioCodec = info.video ? 'aac' : AUDIO_OUTPUTS[opts.audioOut].codec

  let audio: ConversionAudioOptions = { discard: true }
  if (info.audio && (opts.keepAudio || !info.video)) {
    if (audioCodec && !(await ensureAudioEncoder(audioCodec))) throw new NoEncoderError('audio')
    audio = {
      codec: audioCodec ?? 'pcm-s16',
      bitrate: audioCodec ? 160_000 : undefined,
      forceTranscode: true,
      process: audioProcess(mb, speed, opts.keepPitch, info.duration),
    }
  }

  // Sped up, a 30 fps video would carry 60+ frames a second; keep its own rate instead.
  const fps = Math.min(60, Math.round(info.video?.fps || 30))
  // Output frames go into 1/fps slots; keep the first frame landing in each slot. Rounding
  // to the nearest slot tolerates timestamp jitter (WebM stores whole milliseconds).
  let lastSlot = -Infinity

  return convertMedia({
    file,
    mimeType: outputFor(info, opts).mimeType,
    format: info.video ? (m) => new m.Mp4OutputFormat({ fastStart: 'in-memory' }) : AUDIO_OUTPUTS[opts.audioOut].format,
    video: info.video
      ? async (m, size) => {
          const codec = await m.getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], size)
          if (!codec) throw new NoEncoderError('video')
          return {
            codec,
            bitrate: m.QUALITY_HIGH,
            forceTranscode: true,
            process: (sample) => {
              const t = sample.timestamp / speed
              if (speed > 1) {
                const slot = Math.round(t * fps)
                if (slot <= lastSlot) return null
                lastSlot = slot
              }
              sample.setTimestamp(t)
              sample.setDuration(speed > 1 ? 1 / fps : sample.duration / speed)
              return sample
            },
          }
        }
      : undefined,
    audio,
    onProgress,
    onStart,
  })
}
