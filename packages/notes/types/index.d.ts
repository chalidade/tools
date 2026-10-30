// Public types of @chalidade/notes. They mirror src/tools/notes/notes.ts;
// types/check.ts fails the build if they drift.

/** A note as the <markdown-notes> element stores it (and as its JSON backup file holds it). */
export interface Note {
  id: string
  title: string
  /** Markdown source. */
  body: string
  color: NoteColor
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type NoteColor = 'none' | 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

/** The note colours; `label` is [Indonesian, English]. */
export declare const NOTE_COLORS: { id: NoteColor; label: readonly [string, string]; swatch: string }[]

/**
 * Markdown (GitHub-flavoured, single line breaks kept) to HTML, sanitized with
 * DOMPurify. Links get target="_blank" rel="noopener noreferrer". Browser only:
 * throws when there is no DOM to sanitize with, rather than return unsafe HTML.
 */
export declare function renderMarkdown(body: string): string
/** Flips the index-th checklist item ("- [ ]" ⇄ "- [x]") in the source; boxes in code blocks don't count. */
export declare function toggleTask(body: string, index: number): string
/** Checklist progress of a note. */
export declare function taskCount(body: string): { done: number; total: number }
/**
 * Enter inside a list continues it ("- ", "1. ", "- [ ] "); Enter on an empty
 * item ends the list. Null when the cursor is not in a list item.
 */
export declare function continueList(text: string, cursor: number): { text: string; cursor: number } | null
/** Wraps the selection in a mark (`**`), or unwraps it if it is already wrapped. */
export declare function wrap(text: string, start: number, end: number, mark: string, placeholder: string): { text: string; start: number; end: number }
/** Adds (or removes, when every line has it) a prefix like "## " on every selected line. */
export declare function prefixLines(text: string, start: number, end: number, prefix: string): { text: string; start: number; end: number }
/** The note's title, or its first line without Markdown marks. */
export declare function displayTitle(n: Note): string
/** Up to 120 characters of plain text, for a list. */
export declare function snippet(n: Note): string
/** The note as one Markdown document ("# Title" first when it has one). */
export declare function noteAsMarkdown(n: Note): string
/** Loose check for a parsed backup file: an array of objects with string id/body and numeric updatedAt. */
export declare function isNoteList(value: unknown): value is Note[]
