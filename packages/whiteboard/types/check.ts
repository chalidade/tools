// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.BoardDoc, Source.BoardDoc>>()
assert<Same<Public.Page, Source.Page>>()
assert<Same<Public.Item, Source.Item>>()
assert<Same<Public.StrokeItem, Source.StrokeItem>>()
assert<Same<Public.ShapeItem, Source.ShapeItem>>()
assert<Same<Public.TextItem, Source.TextItem>>()
assert<Same<Public.Point, Source.Point>>()
assert<Same<Public.Surface, Source.Surface>>()
assert<Same<Public.Pattern, Source.Pattern>>()
assert<Same<typeof Public.isBoardDoc, typeof Source.isBoardDoc>>()
assert<Same<typeof Public.emptyDoc, typeof Source.emptyDoc>>()
assert<Same<typeof Public.renderPage, typeof Source.renderPage>>()
assert<Same<typeof Public.drawItems, typeof Source.drawItems>>()
assert<Same<typeof Public.drawItem, typeof Source.drawItem>>()
assert<Same<typeof Public.drawSurface, typeof Source.drawSurface>>()
assert<Same<typeof Public.contentBounds, typeof Source.contentBounds>>()
assert<Same<typeof Public.boundsOf, typeof Source.boundsOf>>()
assert<Same<typeof Public.COLORS, typeof Source.COLORS>>()
assert<Same<typeof Public.SURFACES, typeof Source.SURFACES>>()
