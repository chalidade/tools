// Splits a song into stems with SCNet (the site's AI vocal remover: model
// and segment/overlap code from src/tools/vocal-remover, bundled into
// engine.js) on onnxruntime-node. ffmpeg decodes the input to 44.1 kHz
// stereo and encodes each stem.

import fs from 'node:fs/promises'
import path from 'node:path'
import * as ort from 'onnxruntime-node'
import { RATE, separate } from './engine.js'
import { ffmpeg, probe, workdir } from './ffmpeg.js'

const MODEL = process.env.TOOWL_SCNET_MODEL ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '../model/scnet.fp16.onnx')

let session
export function loadModel() {
  session ??= fs.readFile(MODEL).then((bytes) => ort.InferenceSession.create(bytes, { graphOptimizationLevel: 'all' }))
  return session
}

export const FORMATS = {
  mp3: { ext: 'mp3', mime: 'audio/mpeg', args: (kbps) => ['-c:a', 'libmp3lame', '-b:a', `${kbps}k`] },
  wav: { ext: 'wav', mime: 'audio/wav', args: () => ['-c:a', 'pcm_s16le'] },
  flac: { ext: 'flac', mime: 'audio/flac', args: () => ['-c:a', 'flac'] },
  m4a: { ext: 'm4a', mime: 'audio/mp4', args: (kbps) => ['-c:a', 'aac', '-b:a', `${kbps}k`, '-movflags', '+faststart'] },
}

/** Any audio/video → 44.1 kHz stereo planes. */
export async function decodeStereo(bytes, { start, end } = {}) {
  const w = await workdir()
  try {
    const src = w.file('in')
    await fs.writeFile(src, bytes)
    const info = await probe(src)
    if (!info.audio) throw new Error('No audio track found.')
    const trim = [...(start ? ['-ss', String(start)] : []), ...(end ? ['-to', String(end)] : [])]
    const out = w.file('out.f32')
    await ffmpeg([...trim, '-i', src, '-vn', '-ac', '2', '-ar', String(RATE), '-f', 'f32le', out])
    const raw = await fs.readFile(out)
    const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4)
    const n = all.length / 2
    const left = new Float32Array(n)
    const right = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      left[i] = all[2 * i]
      right[i] = all[2 * i + 1]
    }
    return { left, right, duration: n / RATE }
  } finally {
    await w.cleanup()
  }
}

export async function encodeStereo([left, right], format, kbps) {
  const f = FORMATS[format] ?? FORMATS.mp3
  const w = await workdir()
  try {
    const inter = new Float32Array(left.length * 2)
    for (let i = 0; i < left.length; i++) {
      inter[2 * i] = Math.max(-1, Math.min(1, left[i]))
      inter[2 * i + 1] = Math.max(-1, Math.min(1, right[i]))
    }
    const raw = w.file('in.f32')
    await fs.writeFile(raw, Buffer.from(inter.buffer))
    const out = w.file(`out.${f.ext}`)
    await ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', raw, ...f.args(kbps), out])
    return { output: await fs.readFile(out), ...f }
  } finally {
    await w.cleanup()
  }
}

/**
 * @param {'vocals'|'4stems'} mode  vocals → vocals + instrumental; 4stems → vocals, drums, bass, other (+ instrumental)
 * @returns stem name → [left, right]
 */
export async function splitStems(left, right, { mode = 'vocals', quality = 'normal', onProgress } = {}) {
  const s = await loadModel()
  const sources = mode === '4stems' ? ['vocals', 'drums', 'bass', 'other'] : ['vocals']
  const stems = await separate(
    left,
    right,
    async (spec, dims) => {
      const out = await s.run({ mix_spec: new ort.Tensor('float32', spec, dims) })
      return out.stems_spec.data
    },
    { overlap: quality === 'high' ? 4 : 2, sources, onProgress },
  )
  // The instrumental is the song less its vocals, as on the site.
  const [vl, vr] = stems.vocals
  const il = new Float32Array(vl.length)
  const ir = new Float32Array(vr.length)
  for (let i = 0; i < vl.length; i++) {
    il[i] = left[i] - vl[i]
    ir[i] = right[i] - vr[i]
  }
  return { ...stems, instrumental: [il, ir] }
}
