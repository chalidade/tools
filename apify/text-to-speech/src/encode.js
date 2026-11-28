// Float samples → MP3 / M4A / OGG / Opus / FLAC / WAV with ffmpeg.
import fs from 'node:fs/promises'
import { ffmpeg, workdir } from './ffmpeg.js'

export const FORMATS = {
  mp3: { ext: 'mp3', mime: 'audio/mpeg', args: (kbps) => ['-c:a', 'libmp3lame', '-b:a', `${kbps}k`] },
  m4a: { ext: 'm4a', mime: 'audio/mp4', args: (kbps) => ['-c:a', 'aac', '-b:a', `${kbps}k`, '-movflags', '+faststart'] },
  ogg: { ext: 'ogg', mime: 'audio/ogg', args: (kbps) => ['-c:a', 'libvorbis', '-b:a', `${kbps}k`] },
  opus: { ext: 'opus', mime: 'audio/ogg', args: (kbps) => ['-c:a', 'libopus', '-b:a', `${kbps}k`] },
  flac: { ext: 'flac', mime: 'audio/flac', args: () => ['-c:a', 'flac'] },
  wav: { ext: 'wav', mime: 'audio/wav', args: () => ['-c:a', 'pcm_s16le'] },
}

export async function encode(samples, rate, format = 'mp3', kbps = 128) {
  const f = FORMATS[format] ?? FORMATS.mp3
  const w = await workdir()
  try {
    const raw = w.file('in.f32')
    await fs.writeFile(raw, Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength))
    const out = w.file(`out.${f.ext}`)
    await ffmpeg(['-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', raw, ...f.args(kbps), out])
    return { output: await fs.readFile(out), ...f }
  } finally {
    await w.cleanup()
  }
}
