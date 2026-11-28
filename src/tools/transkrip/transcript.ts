// What the page does with a transcript: plain text, and cues for SRT/VTT
// through the Subtitle tool's writer.

import { writeSubtitle, type Cue, type SubFormat } from '../subtitle/subtitle'
import type { Segment } from './whisper'

/** Download size of the model files, in bytes (Whisper base, 8-bit: encoder + decoder + vocabulary). */
export const MODEL_BYTES = 23200850 + 53707539 + 1036584

/** Seconds as m:ss or h:mm:ss, for the transcript view and the timestamped TXT. */
export function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor(s / 60) % 60
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** The transcript as text: segments joined into paragraphs at pauses of 2 s or more, or one timestamped line each. */
export function toText(segments: Segment[], timestamps: boolean) {
  if (timestamps) return segments.map((s) => `[${clock(s.start)}] ${s.text.trim()}`).join('\n') + '\n'
  const paras: string[][] = []
  segments.forEach((s, i) => {
    if (i === 0 || s.start - segments[i - 1].end >= 2) paras.push([])
    paras[paras.length - 1].push(s.text.trim())
  })
  return paras.map((p) => p.join(' ')).join('\n\n') + '\n'
}

/** Subtitle cues: long segments are split at sentence or comma breaks so a line stays readable (about 84 characters). */
export function toCues(segments: Segment[]): Cue[] {
  const cues: Cue[] = []
  for (const s of segments) {
    const text = s.text.trim()
    if (!text) continue
    const parts = splitLine(text, 84)
    const total = parts.reduce((n, p) => n + p.length, 0)
    let t = s.start
    for (const p of parts) {
      const end = t + ((s.end - s.start) * p.length) / total
      cues.push({ start: t, end, text: wrap(p, 42) })
      t = end
    }
  }
  return cues
}

export const toSubtitle = (segments: Segment[], format: SubFormat) => writeSubtitle(toCues(segments), format)

function splitLine(text: string, max: number): string[] {
  if (text.length <= max) return [text]
  const words = text.split(/\s+/)
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) {
      out.push(cur)
      cur = w
    } else cur = cur ? `${cur} ${w}` : w
    // Prefer ending a cue at punctuation once it is reasonably long.
    if (cur.length > max * 0.6 && /[.,!?;:]$/.test(w)) {
      out.push(cur)
      cur = ''
    }
  }
  if (cur) out.push(cur)
  return out
}

/** Two lines at most: break near the middle at a space. */
function wrap(text: string, width: number) {
  if (text.length <= width) return text
  const mid = Math.floor(text.length / 2)
  let best = -1
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
  return best < 0 ? text : `${text.slice(0, best)}\n${text.slice(best + 1)}`
}
