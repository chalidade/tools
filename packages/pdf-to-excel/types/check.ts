// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<typeof Public.LockedPdfError, typeof Source.LockedPdfError>>()
assert<Same<typeof Public.ScannedPdfError, typeof Source.ScannedPdfError>>()
assert<Same<Public.TextPiece, Source.TextPiece>>()
assert<Same<Public.TextLine, Source.TextLine>>()
assert<Same<Public.PageText, Source.PageText>>()
assert<Same<Public.OutCell, Source.OutCell>>()
assert<Same<Public.OutRow, Source.OutRow>>()
assert<Same<Public.OutSheet, Source.OutSheet>>()
assert<Same<Public.PdfTables, Source.PdfTables>>()
assert<Same<Public.SheetMode, Source.SheetMode>>()
assert<Same<Public.AssembleOptions, Source.AssembleOptions>>()
assert<Same<Public.TableBlock, Source.TableBlock>>()
assert<Same<typeof Public.readPdf, typeof Source.readPdf>>()
assert<Same<typeof Public.assemble, typeof Source.assemble>>()
assert<Same<typeof Public.tableBlocks, typeof Source.tableBlocks>>()
assert<Same<typeof Public.buildXlsx, typeof Source.buildXlsx>>()
