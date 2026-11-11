// Puts a music bed under a video in the visitor's browser. The song is decoded
// (any format, resampled to 48 kHz stereo) by a throwaway Mediabunny
// conversion; the video is then remuxed to MP4 with its picture copied as is
// and its sound mixed with the song. A video with no sound gets a new track,
// fed next to a composable conversion. Built on src/lib/media.ts.

import { ensureAudioEncoder, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
import { Mixer, type MixOptions } from './mix'

const RATE = 48_000
const CHUNK = 4800

export interface AddMusicOptions extends MixOptions {
  /** Where in the song to start, in seconds. */
  musicStart: number
}

type Mb = typeof import('mediabunny')

/** The part of the song that can be heard: planar stereo at RATE. */
async function decodeMusic(mb: Mb, file: File, start: number, seconds: number, onProgress: (p: number) => void, track: (c: { cancel: () => Promise<void> }) => void) {
  const frames = Math.max(1, Math.round(seconds * RATE))
  const planes = [new Float32Array(frames), new Float32Array(frames)]
  let filled = 0
  let scratch = new Float32Array(0)
  const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) })
  try {
    const conversion = await mb.Conversion.init({
      input,
      output: new mb.Output({ format: new mb.WavOutputFormat(), target: new mb.NullTarget() }),
      tracks: 'primary',
      video: { discard: true },
      trim: { start, end: start + seconds },
      audio: {
        numberOfChannels: 2,
        sampleRate: RATE,
        codec: 'pcm-s16',
        forceTranscode: true,
        // Samples arrive here already remixed to stereo and resampled.
        process: (sample) => {
          const n = Math.min(sample.numberOfFrames, frames - filled)
          if (n > 0) {
            if (scratch.length < sample.numberOfFrames) scratch = new Float32Array(sample.numberOfFrames)
            for (let c = 0; c < 2; c++) {
              sample.copyTo(scratch, { planeIndex: c, format: 'f32-planar' })
              planes[c].set(scratch.subarray(0, n), filled)
            }
            filled += n
          }
          // The throwaway output still needs samples, or it refuses to finalize.
          return sample
        },
      },
      showWarnings: false,
    })
    if (!conversion.isValid) throw new UnsupportedMediaError(file.name)
    track(conversion)
    conversion.onProgress = onProgress
    await conversion.execute()
  } finally {
    input.dispose()
  }
  return planes.map((p) => p.subarray(0, filled))
}

export async function addMusic(
  video: File,
  info: MediaInfo,
  music: File,
  musicInfo: MediaInfo,
  opts: AddMusicOptions,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
): Promise<Blob> {
  const mb = await import('mediabunny')
  if (!(await ensureAudioEncoder('aac'))) throw new NoEncoderError('audio')

  let canceled = false
  let current: { cancel: () => Promise<void> } | null = null
  onStart(() => {
    canceled = true
    void current?.cancel()
  })

  // Never more of the song than the video can hold (a loop replays this part).
  const start = Math.min(Math.max(0, opts.musicStart), Math.max(0, musicInfo.duration - 0.1))
  const seconds = Math.min(musicInfo.duration - start, info.duration)
  const song = await decodeMusic(mb, music, start, seconds, (p) => onProgress(p * 0.2), (c) => (current = c))
  if (canceled) throw new Error('canceled')
  if (!song[0].length) throw new UnsupportedMediaError(music.name)
  const mixer = new Mixer(song, RATE, info.duration, opts)

  const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(video) })
  try {
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
    const hasAudio = !!info.audio
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: 'primary',
      // No video options: the picture is copied as is (re-encoded only if MP4 cannot hold its codec).
      audio: hasAudio
        ? {
            numberOfChannels: 2,
            sampleRate: RATE,
            codec: 'aac',
            bitrate: 192_000,
            forceTranscode: true,
            process: (sample) => {
              const n = sample.numberOfFrames
              const planes = [0, 1].map((c) => {
                const p = new Float32Array(n)
                sample.copyTo(p, { planeIndex: c, format: 'f32-planar' })
                return p
              })
              const mixed = mixer.mix(Math.max(0, Math.round(sample.timestamp * RATE)), n, planes)
              const data = new Float32Array(n * 2)
              data.set(mixed[0])
              data.set(mixed[1], n)
              return new mb.AudioSample({ data, format: 'f32-planar', numberOfChannels: 2, sampleRate: RATE, timestamp: sample.timestamp })
            },
          }
        : { discard: true },
      // A silent video: this conversion only carries the picture; the music track is fed below.
      composable: !hasAudio,
      showWarnings: false,
    })
    if (!conversion.isValid || !conversion.utilizedTracks.some((t) => t.isVideoTrack())) throw new UnsupportedMediaError(video.name)
    current = conversion
    conversion.onProgress = (p) => onProgress(0.2 + p * 0.8)

    if (hasAudio) {
      await conversion.execute()
    } else {
      const source = new mb.AudioSampleSource({ codec: 'aac', bitrate: 192_000 })
      output.addAudioTrack(source)
      await output.start()
      const total = Math.round(info.duration * RATE)
      const feed = async () => {
        for (let at = 0; at < total; at += CHUNK) {
          if (canceled) throw new Error('canceled')
          const n = Math.min(CHUNK, total - at)
          const [l, r] = mixer.mix(at, n, null)
          const data = new Float32Array(n * 2)
          data.set(l)
          data.set(r, n)
          const sample = new mb.AudioSample({ data, format: 'f32-planar', numberOfChannels: 2, sampleRate: RATE, timestamp: at / RATE })
          await source.add(sample)
          sample.close()
        }
        source.close()
      }
      await Promise.all([conversion.execute(), feed()])
      await output.finalize()
    }
    const buffer = (output.target as InstanceType<Mb['BufferTarget']>).buffer
    if (!buffer) throw new Error('empty output')
    return new Blob([buffer], { type: 'video/mp4' })
  } finally {
    input.dispose()
  }
}
