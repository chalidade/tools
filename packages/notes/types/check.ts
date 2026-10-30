// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Note, Source.Note>>()
assert<Same<Public.NoteColor, Source.NoteColor>>()
assert<Same<typeof Public.NOTE_COLORS, typeof Source.NOTE_COLORS>>()
assert<Same<typeof Public.renderMarkdown, typeof Source.renderMarkdown>>()
assert<Same<typeof Public.toggleTask, typeof Source.toggleTask>>()
assert<Same<typeof Public.taskCount, typeof Source.taskCount>>()
assert<Same<typeof Public.continueList, typeof Source.continueList>>()
assert<Same<typeof Public.wrap, typeof Source.wrap>>()
assert<Same<typeof Public.prefixLines, typeof Source.prefixLines>>()
assert<Same<typeof Public.displayTitle, typeof Source.displayTitle>>()
assert<Same<typeof Public.snippet, typeof Source.snippet>>()
assert<Same<typeof Public.noteAsMarkdown, typeof Source.noteAsMarkdown>>()
assert<Same<typeof Public.isNoteList, typeof Source.isNoteList>>()
