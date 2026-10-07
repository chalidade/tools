// Notes kept in IndexedDB on this device, written in Markdown. The preview is
// marked's output run through DOMPurify; checklist boxes stay clickable and
// write back to the source.

import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { localStore } from '@/lib/local-store'

export interface Note {
  id: string
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type NoteColor = 'none' | 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
export const NOTE_COLORS: { id: NoteColor; label: string; swatch: string }[] = [
  { id: 'none', label: 'Tanpa warna', swatch: 'transparent' },
  { id: 'yellow', label: 'Kuning', swatch: '#facc15' },
  { id: 'green', label: 'Hijau', swatch: '#22c55e' },
  { id: 'blue', label: 'Biru', swatch: '#3b82f6' },
  { id: 'pink', label: 'Merah muda', swatch: '#ec4899' },
  { id: 'purple', label: 'Ungu', swatch: '#a855f7' },
]

const store = localStore<Note>('tools-notes')
export const listNotes = store.list
export const saveNote = store.save
export const deleteNote = store.remove

/** The title to show: the note's own, or its first line without Markdown marks. */
export function displayTitle(n: Note) {
  if (n.title.trim()) return n.title.trim()
  const line = n.body.split('\n').find((l) => l.trim())
  return line ? line.replace(/^\s*(#+|[-*+]|\d+[.)]|>)\s*(\[[ xX]\]\s*)?/, '').trim() || 'Tanpa judul' : 'Tanpa judul'
}

/** A short plain-text preview for the list. */
export function snippet(n: Note) {
  return n.body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

// ---------------------------------------------------------------- Markdown

// Its own DOMPurify instance, so this hook doesn't change how other tools sanitize.
const purify = DOMPurify(window)
purify.addHook('afterSanitizeAttributes', (node) => {
  // Links from a note open in a new tab and can't reach back into this page.
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export function renderMarkdown(body: string) {
  const html = marked.parse(body, { gfm: true, breaks: true, async: false })
  return purify.sanitize(html, { ADD_ATTR: ['checked'] })
}

const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+)\[( |x|X)\]/

/** Flips the index-th checklist item in the source (code blocks don't count, as they don't render boxes). */
export function toggleTask(body: string, index: number) {
  const lines = body.split('\n')
  let fenced = false
  let seen = 0
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) fenced = !fenced
    if (fenced) continue
    const m = lines[i].match(TASK)
    if (!m) continue
    if (seen++ === index) {
      lines[i] = lines[i].replace(TASK, `$1[${m[2] === ' ' ? 'x' : ' '}]`)
      break
    }
  }
  return lines.join('\n')
}

/** How many checklist items are done, for the list badge. */
export function taskCount(body: string) {
  const all = body.match(/^\s*(?:[-*+]|\d+[.)])\s+\[( |x|X)\]/gm) ?? []
  return { done: all.filter((t) => /\[[xX]\]/.test(t)).length, total: all.length }
}

// ---------------------------------------------------------------- editing

/**
 * Enter inside a list continues it ("- ", "1. ", "- [ ] "); Enter on an
 * empty item ends the list. Returns the new text and cursor, or null to let
 * the textarea handle Enter itself.
 */
export function continueList(text: string, cursor: number) {
  const lineStart = text.lastIndexOf('\n', cursor - 1) + 1
  const line = text.slice(lineStart, cursor)
  const m = line.match(/^(\s*)([-*+]|(\d+)([.)]))\s+(\[[ xX]\]\s+)?/)
  if (!m) return null
  if (line.trim() === m[0].trim()) {
    // Empty item: drop the marker and leave the list.
    return { text: text.slice(0, lineStart) + text.slice(cursor), cursor: lineStart }
  }
  const marker = m[3] ? `${Number(m[3]) + 1}${m[4]}` : m[2]
  const prefix = `\n${m[1]}${marker} ${m[5] ? '[ ] ' : ''}`
  return { text: text.slice(0, cursor) + prefix + text.slice(cursor), cursor: cursor + prefix.length }
}

/** Wraps the selection in a mark (**bold**), or unwraps it if already wrapped. */
export function wrap(text: string, start: number, end: number, mark: string, placeholder: string) {
  const selected = text.slice(start, end) || placeholder
  const before = text.slice(0, start)
  const after = text.slice(end)
  if (before.endsWith(mark) && after.startsWith(mark))
    return { text: before.slice(0, -mark.length) + selected + after.slice(mark.length), start: start - mark.length, end: start - mark.length + selected.length }
  return { text: before + mark + selected + mark + after, start: start + mark.length, end: start + mark.length + selected.length }
}

/** Adds (or removes) a prefix like "## " or "- [ ] " on every selected line. */
export function prefixLines(text: string, start: number, end: number, prefix: string) {
  const from = text.lastIndexOf('\n', start - 1) + 1
  const toIdx = text.indexOf('\n', end)
  const to = toIdx === -1 ? text.length : toIdx
  const lines = text.slice(from, to).split('\n')
  const all = lines.every((l) => l.startsWith(prefix))
  const next = lines.map((l) => (all ? l.slice(prefix.length) : prefix + l.replace(/^(#+ |[-*+] (\[[ xX]\] )?|\d+[.)] )/, ''))).join('\n')
  return { text: text.slice(0, from) + next + text.slice(to), start: from, end: from + next.length }
}

// ---------------------------------------------------------------- files

export function noteAsMarkdown(n: Note) {
  return n.title.trim() ? `# ${n.title.trim()}\n\n${n.body}` : n.body
}

export function isNoteList(value: unknown): value is Note[] {
  return (
    Array.isArray(value) &&
    value.every((n) => n && typeof n.id === 'string' && typeof n.body === 'string' && typeof n.updatedAt === 'number')
  )
}

export const WELCOME_BODY = `Catatan tersimpan otomatis di browser ini — tidak dikirim ke mana pun.

## Bisa pakai Markdown
**Tebal**, _miring_, \`kode\`, dan [tautan](https://chalidade.github.io/tools/).

- [x] Buka tool Catatan
- [ ] Centang kotak ini di tampilan Pratinjau
- [ ] Coba tekan Enter di ujung daftar — butirnya berlanjut sendiri

> Tips: Ctrl+B tebal, Ctrl+I miring, Ctrl+K tautan.`
