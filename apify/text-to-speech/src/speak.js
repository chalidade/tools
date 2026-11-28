// Text → speech with the same two engines as toowl.my.id/tools/text-to-speech:
// eSpeak NG (wasm, every language incl. Indonesian) and a Piper neural voice
// (en_US-joe-medium, CC0) on onnxruntime-node, with eSpeak making its
// phonemes. Text is cut into sentence-sized pieces by the site's own code
// (engine.js), spoken one by one and joined into one mono track.

import fs from 'node:fs/promises'
import path from 'node:path'
import factory from 'espeak-ng'
import * as ort from 'onnxruntime-node'
import { PIPER_RATE, VOICES, phonemeIds, pieces, readWav, withPunctuation } from './engine.js'

const MODEL = process.env.TOOWL_PIPER_MODEL ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '../model/en_US-joe-medium.int8.onnx')

export const PRESETS = Object.fromEntries(VOICES.map((v) => [v.id, v]))

async function espeak(args) {
  const lines = []
  const instance = await factory({ arguments: args, print: (l) => lines.push(l), printErr: () => {} })
  return { instance, lines }
}

async function espeakPhonemes(text, voice) {
  const { lines } = await espeak(['-q', '--ipa', '-v', voice, text])
  return lines.map((l) => l.trim()).filter(Boolean)
}

async function espeakSpeak(text, { voice, wpm, pitch }) {
  const { instance } = await espeak(['-v', voice, '-s', String(Math.round(wpm)), '-p', String(Math.round(pitch)), '-w', '/out.wav', text])
  return readWav(instance.FS.readFile('/out.wav'))
}

/** Checks that eSpeak knows a voice ("de", "es+f3", …) before a run spends anything. */
export async function espeakHasVoice(voice) {
  const { lines } = await espeak(['-q', '--ipa', '-v', voice, 'a'])
  return lines.some((l) => l.trim())
}

let piper
function loadPiper() {
  piper ??= fs.readFile(MODEL).then((bytes) => ort.InferenceSession.create(bytes, { graphOptimizationLevel: 'all' }))
  return piper
}

async function piperSpeak(phonemes, speed) {
  const session = await loadPiper()
  const ids = phonemeIds(phonemes)
  if (ids.length <= 3) return new Float32Array(0)
  const out = await session.run({
    input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([0.667, 1 / speed, 0.8]), [3]),
  })
  return out[session.outputNames[0]].data
}

/**
 * @param {string} text
 * @param {{ engine: 'espeak'|'piper', espeak: string, speed?: number, pitch?: number }} voice
 * @returns {Promise<{ samples: Float32Array, rate: number }>} mono, normalized to −1 dBFS
 */
export async function speak(text, voice, { speed = 1, pitch = 50 } = {}) {
  const list = pieces(text)
  if (!list.length) throw new Error('Nothing to read: the text has no letters or digits.')
  const out = []
  let rate = PIPER_RATE
  for (let i = 0; i < list.length; i++) {
    const piece = list[i]
    let samples
    if (voice.engine === 'piper') {
      const lines = await espeakPhonemes(piece.text, voice.espeak)
      samples = await piperSpeak(withPunctuation(piece.text, lines), speed)
      rate = PIPER_RATE
    } else {
      const r = await espeakSpeak(piece.text, { voice: voice.espeak, wpm: Math.min(450, Math.max(80, 165 * speed)), pitch })
      samples = r.samples
      rate = r.rate
    }
    out.push(samples)
    const gap = (piece.paragraphEnd ? 0.45 : voice.engine === 'piper' ? 0.2 : 0.05) / speed
    if (i < list.length - 1) out.push(new Float32Array(Math.round(gap * rate)))
  }
  const all = new Float32Array(out.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of out) {
    all.set(p, at)
    at += p.length
  }
  let peak = 0
  for (const v of all) peak = Math.max(peak, Math.abs(v))
  if (peak > 0) for (let i = 0; i < all.length; i++) all[i] *= 0.89 / peak
  return { samples: all, rate }
}
