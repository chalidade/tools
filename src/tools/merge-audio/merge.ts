// Joins audio files end to end in the visitor's browser. Each file is
// decoded, remixed, and resampled by a Mediabunny conversion whose own
// output is thrown away (NullTarget); its samples are handed, back to back,
// to one shared encoder. Works with any mix of formats, rates, and channels.

import { AUDIO_OUTPUTS, ensureAudioEncoder, NoEncoderError, UnsupportedMediaError, type AudioOut, type MediaInfo } from '@/lib/media'

export interface AudioItem {
  id: string
  file: File
  info: MediaInfo
}

export async function mergeAudio(
  items: AudioItem[],
  opts: { out: AudioOut; gap: number },
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const mb = await import('mediabunny')
  const choice = AUDIO_OUTPUTS[opts.out]
  const codec = choice.codec ?? 'pcm-s16'
  if (choice.codec && !(await ensureAudioEncoder(choice.codec))) throw new NoEncoderError('audio')

  // One rate and channel layout for the whole file: the highest present (up to 48 kHz, stereo).
  const sampleRate = Math.min(48_000, Math.max(...items.map((i) => i.info.audio!.sampleRate)))
  const channels = Math.min(2, Math.max(...items.map((i) => i.info.audio!.channels)))

  const output = new mb.Output({ format: choice.format(mb), target: new mb.BufferTarget() })
  const source = new mb.AudioSampleSource({ codec, bitrate: choice.codec ? 192_000 : undefined })
  output.addAudioTrack(source)
  await output.start()

  let canceled = false
  let current: { cancel: () => Promise<void> } | null = null
  onStart(() => {
    canceled = true
    void current?.cancel()
  })

  const total = items.reduce((n, i) => n + i.info.duration, 0)
  let doneSeconds = 0
  let written = 0 // frames so far; timestamps are laid end to end from this

  for (const [index, item] of items.entries()) {
    if (canceled) throw new Error('canceled')
    const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(item.file) })
    try {
      const conversion = await mb.Conversion.init({
        input,
        output: new mb.Output({ format: new mb.WavOutputFormat(), target: new mb.NullTarget() }),
        tracks: 'primary',
        video: { discard: true },
        audio: {
          numberOfChannels: channels,
          sampleRate,
          codec: 'pcm-s16',
          forceTranscode: true,
          // Samples arrive here already remixed and resampled.
          process: async (sample) => {
            const copy = sample.clone()
            copy.setTimestamp(written / sampleRate)
            written += sample.numberOfFrames
            await source.add(copy)
            copy.close()
            // Also let it reach the throwaway output: an output that got no samples
            // at all refuses to finalize. PCM into a NullTarget costs next to nothing.
            return sample
          },
        },
        showWarnings: false,
      })
      if (!conversion.isValid) throw new UnsupportedMediaError(item.file.name)
      current = conversion
      conversion.onProgress = (p) => onProgress((doneSeconds + p * item.info.duration) / total)
      await conversion.execute()
    } finally {
      input.dispose()
    }
    doneSeconds += item.info.duration

    if (opts.gap > 0 && index < items.length - 1) {
      const frames = Math.round(opts.gap * sampleRate)
      const silence = new mb.AudioSample({
        data: new Float32Array(frames * channels),
        format: 'f32-planar',
        numberOfChannels: channels,
        sampleRate,
        timestamp: written / sampleRate,
      })
      await source.add(silence)
      silence.close()
      written += frames
    }
  }

  source.close()
  await output.finalize()
  return { blob: new Blob([output.target.buffer!], { type: choice.mimeType }), duration: written / sampleRate }
}
