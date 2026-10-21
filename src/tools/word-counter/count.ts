// Text statistics: words, characters, sentences, paragraphs and reading/speaking time.

export interface TextStats {
  words: number
  chars: number
  charsNoSpaces: number
  sentences: number
  paragraphs: number
  lines: number
  /** Minutes to read silently / speak aloud. */
  readMinutes: number
  speakMinutes: number
}

export const READ_WPM = 230
export const SPEAK_WPM = 130

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/** Length in user-perceived characters (an emoji counts as one). */
export function graphemeLength(text: string): number {
  if (!segmenter) return [...text].length
  let n = 0
  for (const _ of segmenter.segment(text)) n++
  return n
}

export function countWords(text: string): number {
  // Letters/digits with inner apostrophes or hyphens form one word: "don't", "kupu-kupu", "3.5".
  return text.match(/[\p{L}\p{N}]+(?:['’\-.,][\p{L}\p{N}]+)*/gu)?.length ?? 0
}

export function countSentences(text: string): number {
  const t = text.trim()
  if (!t) return 0
  // Sentence ends at . ! ? … followed by space/end; a trailing fragment still counts.
  const parts = t.split(/[.!?…]+(?:["')\]]*)(?:\s+|$)/u).filter((p) => /[\p{L}\p{N}]/u.test(p))
  return parts.length
}

export function analyze(text: string): TextStats {
  const words = countWords(text)
  const trimmed = text.trim()
  return {
    words,
    chars: graphemeLength(text),
    charsNoSpaces: graphemeLength(text.replace(/\s/gu, '')),
    sentences: countSentences(text),
    paragraphs: trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
    lines: text ? text.split(/\r?\n/).length : 0,
    readMinutes: words / READ_WPM,
    speakMinutes: words / SPEAK_WPM,
  }
}

/** "1 mnt 30 dtk"-style pieces; the UI formats the units. */
export function minutesToParts(minutes: number): { min: number; sec: number } {
  const total = Math.round(minutes * 60)
  return { min: Math.floor(total / 60), sec: total % 60 }
}

export interface Limit {
  id: string
  name: string
  max: number
  /** Soft limits (SEO) are advice, not a hard cut-off. */
  soft?: boolean
}

export const LIMITS: Limit[] = [
  { id: 'x', name: 'X (Twitter)', max: 280 },
  { id: 'ig-caption', name: 'Instagram caption', max: 2200 },
  { id: 'ig-bio', name: 'Instagram bio', max: 150 },
  { id: 'tiktok', name: 'TikTok caption', max: 2200 },
  { id: 'wa-status', name: 'WhatsApp status', max: 700 },
  { id: 'linkedin', name: 'LinkedIn post', max: 3000 },
  { id: 'sms', name: 'SMS (1 pesan / 1 message)', max: 160 },
  { id: 'meta-title', name: 'SEO title', max: 60, soft: true },
  { id: 'meta-desc', name: 'Meta description', max: 160, soft: true },
]
