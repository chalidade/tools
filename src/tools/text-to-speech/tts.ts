// Text → speech, all on the device. Two engines:
// - eSpeak NG (espeak.ts): formant synthesis, every language incl. Indonesian,
//   small and instant but clearly synthetic.
// - Piper (piper.ts): a neural English voice that sounds natural; espeak
//   still turns the text into phonemes for it.
// Long text is cut into sentence-sized pieces, spoken one by one (progress,
// cancel, and espeak's fixed memory), and joined into one mono track.

import type { Lang } from '@/lib/i18n'
import { espeakPhonemes, espeakSpeak } from './espeak'
import { PIPER_RATE, piperSpeak } from './piper'

export type VoiceId = 'id-m' | 'id-f' | 'id-m2' | 'id-f2' | 'en-neural' | 'en-m' | 'en-f'

export interface Voice {
  id: VoiceId
  lang: Lang
  label: [string, string]
  engine: 'espeak' | 'piper'
  /** espeak voice + variant; for Piper, the voice used to make phonemes. */
  espeak: string
}

export const VOICES: Voice[] = [
  { id: 'id-m', lang: 'id', label: ['Pria', 'Male'], engine: 'espeak', espeak: 'id+m3' },
  { id: 'id-f', lang: 'id', label: ['Wanita', 'Female'], engine: 'espeak', espeak: 'id+f3' },
  { id: 'id-m2', lang: 'id', label: ['Pria (berat)', 'Male (deep)'], engine: 'espeak', espeak: 'id+m1' },
  { id: 'id-f2', lang: 'id', label: ['Wanita (lembut)', 'Female (soft)'], engine: 'espeak', espeak: 'id+f4' },
  { id: 'en-neural', lang: 'en', label: ['Joe — natural (AI)', 'Joe — natural (AI)'], engine: 'piper', espeak: 'en-us' },
  { id: 'en-m', lang: 'en', label: ['Pria (cepat dimuat)', 'Male (quick to load)'], engine: 'espeak', espeak: 'en-us+m3' },
  { id: 'en-f', lang: 'en', label: ['Wanita (cepat dimuat)', 'Female (quick to load)'], engine: 'espeak', espeak: 'en-us+f3' },
]

export const voiceById = (id: VoiceId) => VOICES.find((v) => v.id === id) ?? VOICES[0]

/** Longest piece handed to an engine at once (espeak has 32 MB of memory; Piper slows down on long inputs). */
const MAX_PIECE = 280
export const MAX_TEXT = 20_000

/** Sentence-sized pieces: split at sentence ends, then long ones at commas, then at spaces. */
export function pieces(text: string): { text: string; paragraphEnd: boolean }[] {
  const out: { text: string; paragraphEnd: boolean }[] = []
  // A blank line is a paragraph break (longer pause); a single line break ends a sentence, as in a script.
  for (const paragraph of text.split(/\r?\n[^\S\n]*\r?\n/)) {
    const parts: string[] = []
    for (const line of paragraph.split(/\r?\n/)) {
      const flat = line.replace(/\s+/g, ' ').trim()
      if (!/[\p{L}\p{N}]/u.test(flat)) continue
      for (const s of flat.split(/(?<=[.!?…]["')\]]*)\s+/)) parts.push(...splitLong(s))
    }
    if (!parts.length) continue
    // Merge short sentences so the voice keeps its flow and the engine runs fewer times.
    const merged: string[] = []
    for (const p of parts) {
      const last = merged.length - 1
      if (last >= 0 && merged[last].length + p.length + 1 <= MAX_PIECE / 2) merged[last] += (/[.!?…,;:]["')\]]*$/.test(merged[last]) ? ' ' : '. ') + p
      else merged.push(p)
    }
    merged.forEach((p, i) => out.push({ text: p, paragraphEnd: i === merged.length - 1 }))
  }
  return out
}

function splitLong(s: string): string[] {
  if (s.length <= MAX_PIECE) return [s]
  const out: string[] = []
  let rest = s
  while (rest.length > MAX_PIECE) {
    const window = rest.slice(0, MAX_PIECE)
    let cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(': '))
    if (cut < MAX_PIECE / 3) cut = window.lastIndexOf(' ')
    if (cut < 1) cut = MAX_PIECE
    out.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) out.push(rest)
  return out
}

const PUNCT: Record<string, string> = { ',': ',', ';': ';', ':': ':', '.': '.', '!': '!', '?': '?', '…': '.' }

/**
 * Piper wants punctuation among the phonemes (it shapes pauses and
 * intonation), but espeak's IPA output drops it and gives one line per
 * clause. Clauses end where punctuation meets a space, as in espeak, so when
 * the counts agree each line gets its clause's mark back.
 */
export function withPunctuation(text: string, lines: string[]): string {
  const clauses = text.split(/(?<=[,;:.!?…]["')\]]*)\s+/).filter((c) => /[\p{L}\p{N}]/u.test(c))
  if (clauses.length !== lines.length) return lines.join(', ') + '.'
  return lines
    .map((line, i) => {
      const mark = clauses[i].match(/([,;:.!?…])["')\]]*$/)?.[1]
      return line + (mark ? PUNCT[mark] : i === lines.length - 1 ? '.' : ',')
    })
    .join(' ')
}

export interface SpeakOptions {
  voice: Voice
  /** 0.5–2, 1 = normal. */
  speed: number
  /** 0–99 (espeak only), 50 = normal. */
  pitch: number
  onProgress: (done: number) => void
  isCanceled: () => boolean
}

export class SpeechCanceled extends Error {}

/** Speaks the whole text; returns mono samples normalized to −1 dBFS. */
export async function speak(text: string, o: SpeakOptions): Promise<{ samples: Float32Array; rate: number }> {
  const list = pieces(text)
  const out: Float32Array[] = []
  let rate = PIPER_RATE
  for (let i = 0; i < list.length; i++) {
    if (o.isCanceled()) throw new SpeechCanceled()
    const piece = list[i]
    let samples: Float32Array
    if (o.voice.engine === 'piper') {
      const lines = await espeakPhonemes(piece.text, o.voice.espeak)
      samples = await piperSpeak(withPunctuation(piece.text, lines), o.speed)
      rate = PIPER_RATE
    } else {
      const r = await espeakSpeak(piece.text, {
        voice: o.voice.espeak,
        wpm: Math.min(450, Math.max(80, 165 * o.speed)),
        pitch: o.pitch,
      })
      samples = r.samples
      rate = r.rate
    }
    out.push(samples)
    // A beat between sentences, a longer one between paragraphs (espeak already ends each piece with a short pause).
    const gap = (piece.paragraphEnd ? 0.45 : o.voice.engine === 'piper' ? 0.2 : 0.05) / o.speed
    if (i < list.length - 1) out.push(new Float32Array(Math.round(gap * rate)))
    o.onProgress((i + 1) / list.length)
    // Let the page paint the progress between pieces.
    await new Promise((r) => setTimeout(r, 0))
  }
  return { samples: normalize(concat(out)), rate }
}

function concat(parts: Float32Array[]) {
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    all.set(p, at)
    at += p.length
  }
  return all
}

function normalize(samples: Float32Array) {
  let peak = 0
  for (const v of samples) peak = Math.max(peak, Math.abs(v))
  if (peak > 0) {
    const gain = 0.89 / peak
    for (let i = 0; i < samples.length; i++) samples[i] *= gain
  }
  return samples
}

/** Mono 16-bit PCM WAV. */
export function wavBlob(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true)
  return new Blob([buffer], { type: 'audio/wav' })
}
