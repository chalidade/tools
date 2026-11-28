// Stems to files: a 16-bit WAV written directly (also the preview players'
// source), MP3 through Mediabunny with the wasm encoder when needed.

import { AUDIO_OUTPUTS, ensureAudioEncoder, NoEncoderError } from '@/lib/media'

export function wavBlob([left, right]: [Float32Array, Float32Array], rate: number) {
  const n = left.length
  const buf = new ArrayBuffer(44 + n * 4)
  const v = new DataView(buf)
  const text = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  v.setUint32(4, 36 + n * 4, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 2, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 4, true)
  v.setUint16(32, 4, true)
  v.setUint16(34, 16, true)
  text(36, 'data')
  v.setUint32(40, n * 4, true)
  const pcm = new Int16Array(buf, 44, n * 2)
  const q = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)))
  for (let i = 0; i < n; i++) {
    pcm[2 * i] = q(left[i])
    pcm[2 * i + 1] = q(right[i])
  }
  return new Blob([buf], { type: 'audio/wav' })
}

/** The WAV's samples back as planar float32 (for encoding without keeping floats around). */
async function readWav(wav: Blob) {
  const buf = await wav.arrayBuffer()
  const pcm = new Int16Array(buf, 44)
  const n = pcm.length / 2
  const data = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    data[i] = pcm[2 * i] / 32768
    data[n + i] = pcm[2 * i + 1] / 32768
  }
  return { data, frames: n }
}

export async function mp3Blob(wav: Blob, rate: number) {
  if (!(await ensureAudioEncoder('mp3'))) throw new NoEncoderError('audio')
  const mb = await import('mediabunny')
  const { data, frames } = await readWav(wav)
  const output = new mb.Output({ format: AUDIO_OUTPUTS.mp3.format(mb), target: new mb.BufferTarget() })
  const source = new mb.AudioSampleSource({ codec: 'mp3', bitrate: 256_000 })
  output.addAudioTrack(source)
  await output.start()
  // Fed in one-second pieces, so the encoder never holds the whole song twice.
  for (let at = 0; at < frames; at += rate) {
    const len = Math.min(rate, frames - at)
    const piece = new Float32Array(len * 2)
    piece.set(data.subarray(at, at + len), 0)
    piece.set(data.subarray(frames + at, frames + at + len), len)
    const sample = new mb.AudioSample({ data: piece, format: 'f32-planar', numberOfChannels: 2, sampleRate: rate, timestamp: at / rate })
    await source.add(sample)
    sample.close()
  }
  source.close()
  await output.finalize()
  return new Blob([output.target.buffer!], { type: 'audio/mpeg' })
}
