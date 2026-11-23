// Pure SRT/VTT logic: parse, write, shift, stretch, merge. Times are seconds.

export interface Cue {
  start: number
  end: number
  text: string
}

export type SubFormat = 'srt' | 'vtt'

const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/

function parseTime(s: string): number | null {
  const m = TIME.exec(s)
  if (!m) return null
  const ms = Number(m[4].padEnd(3, '0'))
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + ms / 1000
}

/** Reads SRT or WebVTT text (format is detected; NOTE/STYLE/REGION blocks and cue settings are dropped). */
export function parseSubtitle(input: string): Cue[] {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const cues: Cue[] = []
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue
    if (/^(NOTE|STYLE|REGION)\b/.test(lines[0])) continue
    const [a, b] = lines[i].split('-->')
    const start = parseTime(a)
    const end = parseTime(b ?? '')
    if (start === null || end === null) continue
    const body = lines.slice(i + 1).join('\n').trim()
    cues.push({ start, end: Math.max(end, start), text: body })
  }
  return cues
}

export function formatTime(sec: number, format: SubFormat): string {
  const total = Math.max(0, Math.round(sec * 1000))
  const ms = total % 1000
  const s = Math.floor(total / 1000) % 60
  const m = Math.floor(total / 60000) % 60
  const h = Math.floor(total / 3600000)
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(h)}:${p(m)}:${p(s)}${format === 'srt' ? ',' : '.'}${p(ms, 3)}`
}

export function writeSubtitle(cues: Cue[], format: SubFormat): string {
  const body = cues
    .map((c, i) => {
      const range = `${formatTime(c.start, format)} --> ${formatTime(c.end, format)}`
      return format === 'srt' ? `${i + 1}\n${range}\n${c.text}` : `${range}\n${c.text}`
    })
    .join('\n\n')
  return format === 'vtt' ? `WEBVTT\n\n${body}\n` : `${body}\n`
}

/** Moves every cue by `by` seconds (negative = earlier). Cues that end before 0 are dropped; the rest start at 0 at the earliest. */
export function shiftCues(cues: Cue[], by: number): Cue[] {
  return cues
    .map((c) => ({ ...c, start: c.start + by, end: c.end + by }))
    .filter((c) => c.end > 0)
    .map((c) => ({ ...c, start: Math.max(0, c.start) }))
}

/** Multiplies every time by `factor` (e.g. 25 → 23.976 fps is 25 / 23.976). */
export function stretchCues(cues: Cue[], factor: number): Cue[] {
  return cues.map((c) => ({ ...c, start: c.start * factor, end: c.end * factor }))
}

/** Appends `second` after `first`, offset by `offset` seconds, sorted by start. */
export function mergeCues(first: Cue[], second: Cue[], offset: number): Cue[] {
  return [...first, ...shiftCues(second, offset)].sort((a, b) => a.start - b.start || a.end - b.end)
}

export function lastEnd(cues: Cue[]): number {
  return cues.reduce((m, c) => Math.max(m, c.end), 0)
}

/** Parses "1:02:03,5", "02:03.250" or plain seconds ("12.5", "-3"); null when invalid. Sign allowed. */
export function parseOffset(input: string): number | null {
  const s = input.trim().replace(',', '.')
  if (!s) return null
  const neg = s.startsWith('-')
  const body = s.replace(/^[+-]/, '')
  if (/^\d+(\.\d+)?$/.test(body)) return (neg ? -1 : 1) * Number(body)
  const parts = body.split(':')
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+(\.\d+)?$/.test(p))) return null
  const sec = parts.reduce((acc, p) => acc * 60 + Number(p), 0)
  return neg ? -sec : sec
}
