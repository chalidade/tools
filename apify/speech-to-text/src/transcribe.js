// Speech → text with the site's own Whisper engine (src/tools/transkrip,
// bundled into engine.js) on onnxruntime-node. Audio of any format, and the
// sound of any video, is decoded by ffmpeg to 16 kHz mono first.

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as ort from 'onnxruntime-node'
import { LANGS, RATE, SPECS, Whisper, clock, toCues, toText, writeSubtitle } from './engine.js'
import { ffmpeg, probe, workdir } from './ffmpeg.js'

// Every language of multilingual Whisper, in its token order (<|en|> = 50259 …).
const ALL = 'en zh de es ru ko fr ja pt tr pl ca nl ar sv it id hi fi vi he uk el ms cs ro da hu ta no th ur hr bg lt la mi ml cy sk te fa lv bn sr az sl kn et mk br eu is hy ne mn bs kk sq sw gl mr pa si km sn yo so af oc ka be tg sd gu am yi lo uz fo ht ps tk nn mt sa lb my bo tl mg as tt haw ln ha ba jw su'.split(' ')
ALL.forEach((code, i) => (LANGS[code] = 50259 + i))
export const LANGUAGES = ALL

const MODEL_DIR = process.env.TOOWL_MODEL_DIR ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '../model')

let engine
export function loadWhisper() {
  engine ??= (async () => {
    const [enc, dec, vocab] = await Promise.all([
      fs.readFile(path.join(MODEL_DIR, 'encoder_model_quantized.onnx')),
      fs.readFile(path.join(MODEL_DIR, 'decoder_model_merged_quantized.onnx')),
      fs.readFile(path.join(MODEL_DIR, 'vocab.json'), 'utf8'),
    ])
    return Whisper.create(ort, enc, dec, JSON.parse(vocab), SPECS.base, ['cpu'])
  })()
  return engine
}

/** Any audio/video bytes → 16 kHz mono float samples, plus the media's duration. */
export async function decodeAudio(bytes, { start, end } = {}) {
  const w = await workdir()
  try {
    const src = w.file('in')
    await fs.writeFile(src, bytes)
    const info = await probe(src)
    if (!info.audio) throw new Error('No audio track found.')
    const trim = [...(start ? ['-ss', String(start)] : []), ...(end ? ['-to', String(end)] : [])]
    const out = w.file('out.f32')
    await ffmpeg([...trim, '-i', src, '-vn', '-ac', '1', '-ar', String(RATE), '-f', 'f32le', out])
    const raw = await fs.readFile(out)
    const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4).slice()
    return { samples, duration: samples.length / RATE }
  } finally {
    await w.cleanup()
  }
}

/**
 * @param {Float32Array} samples 16 kHz mono
 * @param {{ language?: string }} o  a Whisper language code, or 'auto'
 */
export async function transcribe(samples, o = {}) {
  const whisper = await loadWhisper()
  let detected = null
  const language = o.language && o.language !== 'auto' && LANGS[o.language] ? o.language : 'auto'
  const segments = await whisper.transcribe(samples, {
    language,
    onLanguage: (code) => (detected = code),
    onProgress: o.onProgress,
  })
  const round = (t) => Math.round(t * 100) / 100
  return {
    language: language === 'auto' ? detected : language,
    segments: segments.map((s) => ({ start: round(s.start), end: round(s.end), text: s.text.trim() })),
    text: toText(segments, false).trim(),
    timestamped: toText(segments, true),
    srt: writeSubtitle(toCues(segments), 'srt'),
    vtt: writeSubtitle(toCues(segments), 'vtt'),
  }
}

export { clock }
export const threads = () => Math.max(1, os.cpus().length)
