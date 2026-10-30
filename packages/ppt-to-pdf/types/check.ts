// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Deck, Source.Deck>>()
assert<Same<typeof Public.readPptx, typeof Source.readPptx>>()
assert<Same<typeof Public.downloadPdf, typeof Source.downloadPdf>>()
assert<Same<typeof Public.buildPrintHtml, typeof Source.buildPrintHtml>>()
assert<Same<typeof Public.printDeck, typeof Source.printDeck>>()
