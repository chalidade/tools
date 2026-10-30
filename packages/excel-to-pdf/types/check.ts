// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.CellStyle, Source.CellStyle>>()
assert<Same<Public.SheetCell, Source.SheetCell>>()
assert<Same<Public.Sheet, Source.Sheet>>()
assert<Same<Public.Spreadsheet, Source.Spreadsheet>>()
assert<Same<Public.PageSize, Source.PageSize>>()
assert<Same<Public.Orientation, Source.Orientation>>()
assert<Same<Public.PdfOptions, Source.PdfOptions>>()
assert<Same<typeof Public.UnsupportedSheetError, typeof Source.UnsupportedSheetError>>()
assert<Same<typeof Public.readSpreadsheet, typeof Source.readSpreadsheet>>()
assert<Same<typeof Public.pageFor, typeof Source.pageFor>>()
assert<Same<typeof Public.buildPdf, typeof Source.buildPdf>>()
