// Audio/video conversion in the visitor's browser with Mediabunny
// (https://mediabunny.dev) on top of WebCodecs: the browser's own — usually
// hardware — encoders. Files are read in chunks from the Blob, never uploaded.
// Mediabunny and the wasm AAC/MP3 encoders are dynamic imports.

import type { AudioCodec, Conversion, ConversionAudioOptions, ConversionVideoOptions, OutputFormat } from 'mediabunny'

export class UnsupportedMediaError extends Error {}
export class NoEncoderError extends Error {}

export const hasWebCodecs = () => typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined'

const mediabunny = () => import('mediabunny')

export interface MediaInfo {
  /** Seconds. */
  duration: number
  video?: { width: number; height: number; codec: string | null; fps: number; bitrate: number }
  audio?: { codec: string | null; channels: number; sampleRate: number; bitrate: number }
}

async function openInput(file: File) {
  const mb = await mediabunny()
  const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) })
  try {
    await input.getFormat()
  } catch {
    input.dispose()
    throw new UnsupportedMediaError()
  }
  return { mb, input }
}

export async function probeMedia(file: File): Promise<MediaInfo> {
  const { input } = await openInput(file)
  try {
    const duration = await input.computeDuration()
    const v = await input.getPrimaryVideoTrack()
    const a = await input.getPrimaryAudioTrack()
    const info: MediaInfo = { duration }
    if (v) {
      const stats = await v.computePacketStats(120)
      info.video = {
        width: v.displayWidth,
        height: v.displayHeight,
        codec: v.codec,
        fps: stats.averagePacketRate,
        bitrate: stats.averageBitrate,
      }
    }
    if (a) {
      const stats = await a.computePacketStats(120)
      info.audio = {
        codec: a.codec,
        channels: a.numberOfChannels,
        sampleRate: a.sampleRate,
        bitrate: stats.averageBitrate,
      }
    }
    if (!info.video && !info.audio) throw new UnsupportedMediaError()
    return info
  } finally {
    input.dispose()
  }
}

/**
 * Makes sure `codec` can be encoded. Browsers cannot encode MP3 at all, and
 * many (Chrome on Linux, Firefox) cannot encode AAC; Mediabunny's wasm
 * encoders fill those gaps, loaded only when needed.
 */
export async function ensureAudioEncoder(codec: AudioCodec) {
  const mb = await mediabunny()
  if (await mb.canEncodeAudio(codec)) return true
  if (codec === 'aac') (await import('@mediabunny/aac-encoder')).registerAacEncoder()
  else if (codec === 'mp3') (await import('@mediabunny/mp3-encoder')).registerMp3Encoder()
  else return false
  return mb.canEncodeAudio(codec)
}

export interface ConvertJob {
  file: File
  format: (mb: typeof import('mediabunny')) => OutputFormat
  mimeType: string
  video?:
    | ConversionVideoOptions
    | ((mb: typeof import('mediabunny'), info: { width: number; height: number }) => Promise<ConversionVideoOptions>)
  audio?: ConversionAudioOptions
  /** 0–1. */
  onProgress: (progress: number) => void
  /** Set by the caller to cancel. */
  onStart?: (cancel: () => void) => void
}

export async function convertMedia(job: ConvertJob): Promise<Blob> {
  const { mb, input } = await openInput(job.file)
  let conversion: Conversion | undefined
  try {
    const output = new mb.Output({ format: job.format(mb), target: new mb.BufferTarget() })
    const videoTrack = await input.getPrimaryVideoTrack()
    const video =
      typeof job.video === 'function'
        ? videoTrack
          ? await job.video(mb, { width: videoTrack.displayWidth, height: videoTrack.displayHeight })
          : undefined
        : job.video

    conversion = await mb.Conversion.init({ input, output, video, audio: job.audio, tracks: 'primary' })
    if (!conversion.isValid) {
      const reasons = conversion.discardedTracks.map((t) => t.reason)
      throw reasons.some((r) => /encod/i.test(r))
        ? new NoEncoderError(reasons.join(', '))
        : new UnsupportedMediaError(reasons.join(', '))
    }
    const running = conversion
    job.onStart?.(() => void running.cancel())
    conversion.onProgress = (p) => job.onProgress(p)
    await conversion.execute()

    const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer
    if (!buffer) throw new Error('empty output')
    return new Blob([buffer], { type: job.mimeType })
  } finally {
    input.dispose()
  }
}

export function formatDuration(seconds: number) {
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function formatSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}
