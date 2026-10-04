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

export async function openMedia(file: File) {
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
  const { input } = await openMedia(file)
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
  /** Keep only this part of the input, in seconds. */
  trim?: { start: number; end: number }
  /** 0–1. */
  onProgress: (progress: number) => void
  /** Set by the caller to cancel. */
  onStart?: (cancel: () => void) => void
}

export async function convertMedia(job: ConvertJob): Promise<Blob> {
  const { mb, input } = await openMedia(job.file)
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

    conversion = await mb.Conversion.init({ input, output, video, audio: job.audio, trim: job.trim, tracks: 'primary' })
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

export interface OutputChoice {
  format: (mb: typeof import('mediabunny')) => OutputFormat
  mimeType: string
  ext: string
}

/**
 * The output container matching an input's, so trimming an MP3 gives an
 * MP3 and a WebM stays WebM. Unknown containers fall back to MP4 / M4A.
 */
export async function sameContainer(file: File): Promise<OutputChoice> {
  const { input } = await openMedia(file)
  try {
    const name = (await input.getFormat()).name
    const hasVideo = !!(await input.getPrimaryVideoTrack())
    switch (name) {
      case 'QuickTime File Format':
        return { format: (mb) => new mb.MovOutputFormat({ fastStart: 'in-memory' }), mimeType: 'video/quicktime', ext: 'mov' }
      case 'WebM':
        return { format: (mb) => new mb.WebMOutputFormat(), mimeType: hasVideo ? 'video/webm' : 'audio/webm', ext: 'webm' }
      case 'Matroska':
        return { format: (mb) => new mb.MkvOutputFormat(), mimeType: 'video/x-matroska', ext: 'mkv' }
      case 'MP3':
        return { format: (mb) => new mb.Mp3OutputFormat(), mimeType: 'audio/mpeg', ext: 'mp3' }
      case 'WAVE':
        return { format: (mb) => new mb.WavOutputFormat(), mimeType: 'audio/wav', ext: 'wav' }
      case 'Ogg':
        return { format: (mb) => new mb.OggOutputFormat(), mimeType: 'audio/ogg', ext: 'ogg' }
      case 'ADTS':
        return { format: (mb) => new mb.AdtsOutputFormat(), mimeType: 'audio/aac', ext: 'aac' }
      case 'FLAC':
        return { format: (mb) => new mb.FlacOutputFormat(), mimeType: 'audio/flac', ext: 'flac' }
      default:
        return hasVideo
          ? { format: (mb) => new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), mimeType: 'video/mp4', ext: 'mp4' }
          : { format: (mb) => new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), mimeType: 'audio/mp4', ext: 'm4a' }
    }
  } finally {
    input.dispose()
  }
}

/** Audio-only outputs the audio tools offer. */
export type AudioOut = 'mp3' | 'm4a' | 'wav'
export const AUDIO_OUTPUTS: Record<AudioOut, OutputChoice & { codec: AudioCodec | null }> = {
  mp3: { format: (mb) => new mb.Mp3OutputFormat(), mimeType: 'audio/mpeg', ext: 'mp3', codec: 'mp3' },
  m4a: { format: (mb) => new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), mimeType: 'audio/mp4', ext: 'm4a', codec: 'aac' },
  wav: { format: (mb) => new mb.WavOutputFormat(), mimeType: 'audio/wav', ext: 'wav', codec: null },
}

export const isCanceled = (e: unknown) => (e as Error)?.name === 'ConversionCanceledError' || /cancel/i.test(String(e))

/** "1:02.35" — minutes, seconds, and hundredths; hours when needed. */
export function formatTime(seconds: number) {
  const t = Math.max(0, seconds)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = (t % 60).toFixed(2).padStart(5, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Reads "1:02.35", "62.35", "1:02:03" or "1:02,5" back to seconds; null when it is not a time. */
export function parseTime(text: string): number | null {
  const parts = text.trim().replace(',', '.').split(':')
  if (!parts.length || parts.length > 3 || parts.some((p) => !/^\d+(\.\d*)?$/.test(p))) return null
  return parts.reduce((total, p) => total * 60 + Number(p), 0)
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

/** Small evenly spaced frames of a video, as data URLs, for a timeline strip. */
export async function videoThumbnails(file: File, count: number, height: number): Promise<string[]> {
  const { mb, input } = await openMedia(file)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) return []
    const duration = await input.computeDuration()
    const sink = new mb.CanvasSink(track, { height, poolSize: 1 })
    const times = Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * duration)
    const out: string[] = []
    for await (const frame of sink.canvasesAtTimestamps(times)) {
      out.push(frame ? (frame.canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.7) : '')
    }
    return out
  } finally {
    input.dispose()
  }
}

/** Loudness envelope of the audio track: `buckets` peaks between 0 and 1. */
export async function audioPeaks(file: File, buckets: number): Promise<number[]> {
  const { mb, input } = await openMedia(file)
  try {
    const track = await input.getPrimaryAudioTrack()
    if (!track) return []
    const duration = await input.computeDuration()
    const peaks = Array.from({ length: buckets }, () => 0)
    const sink = new mb.AudioSampleSink(track)
    let plane = new Float32Array(0)
    for await (const sample of sink.samples()) {
      const n = sample.numberOfFrames
      if (plane.length < n) plane = new Float32Array(n)
      // The first channel is enough for a picture of the loudness.
      sample.copyTo(plane, { planeIndex: 0, format: 'f32-planar' })
      for (let i = 0; i < n; i += 8) {
        const b = Math.min(buckets - 1, Math.floor(((sample.timestamp + i / sample.sampleRate) / duration) * buckets))
        const v = Math.abs(plane[i])
        if (v > peaks[b]) peaks[b] = v
      }
      sample.close()
    }
    const max = Math.max(...peaks, 1e-6)
    return peaks.map((p) => p / max)
  } finally {
    input.dispose()
  }
}
