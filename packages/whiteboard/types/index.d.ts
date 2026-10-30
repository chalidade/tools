// Public types of @chalidade/whiteboard. They mirror src/tools/whiteboard/board.ts;
// types/check.ts fails the build if they drift.
//
// A board is vector data in world coordinates; the tool saves it as a
// `.board.json` file. These functions read and draw that file. Browser only
// (they draw on a <canvas>).

export type Point = { x: number; y: number }
export type Surface = 'white' | 'black'
export type Pattern = 'plain' | 'grid' | 'lines' | 'dots'

export interface StrokeItem {
  kind: 'stroke'
  id: string
  /** A colour id from COLORS, resolved per surface. */
  color: string
  size: number
  /** x, y, pressure (0–1). */
  points: [number, number, number][]
  /** No real pressure (mouse, finger): simulate it from speed. */
  simulate: boolean
  /** Highlighter: drawn translucent. */
  marker?: boolean
  /** Erases what was drawn before it. */
  erase?: boolean
}
export interface ShapeItem {
  kind: 'line' | 'arrow' | 'rect' | 'ellipse'
  id: string
  color: string
  size: number
  a: Point
  b: Point
}
export interface TextItem {
  kind: 'text'
  id: string
  color: string
  /** Font size in world px. */
  size: number
  at: Point
  text: string
}
export type Item = StrokeItem | ShapeItem | TextItem

export interface Page {
  id: string
  items: Item[]
}

export interface BoardDoc {
  surface: Surface
  pattern: Pattern
  pages: Page[]
}

/** The ink colours by id, with their value on each surface; `label` is [Indonesian, English]. */
export declare const COLORS: readonly [
  { readonly id: 'ink'; readonly label: readonly ['Tinta', 'Ink']; readonly white: '#111827'; readonly black: '#f8fafc' },
  { readonly id: 'red'; readonly label: readonly ['Merah', 'Red']; readonly white: '#dc2626'; readonly black: '#fca5a5' },
  { readonly id: 'blue'; readonly label: readonly ['Biru', 'Blue']; readonly white: '#2563eb'; readonly black: '#93c5fd' },
  { readonly id: 'green'; readonly label: readonly ['Hijau', 'Green']; readonly white: '#16a34a'; readonly black: '#86efac' },
  { readonly id: 'orange'; readonly label: readonly ['Oranye', 'Orange']; readonly white: '#ea580c'; readonly black: '#fdba74' },
  { readonly id: 'purple'; readonly label: readonly ['Ungu', 'Purple']; readonly white: '#7c3aed'; readonly black: '#c4b5fd' },
  { readonly id: 'yellow'; readonly label: readonly ['Kuning', 'Yellow']; readonly white: '#ca8a04'; readonly black: '#fde047' },
  { readonly id: 'pink'; readonly label: readonly ['Merah muda', 'Pink']; readonly white: '#db2777'; readonly black: '#f9a8d4' },
]
/** Board background and ruling colour per surface. */
export declare const SURFACES: Record<Surface, { bg: string; line: string; label: string }>

/** A blank white, grid-ruled board with one page. */
export declare function emptyDoc(): BoardDoc
/** Validates a parsed board file, every item included. Use it before drawing an untrusted file. */
export declare function isBoardDoc(value: unknown): value is BoardDoc
/** A page as a canvas (board colour, ruling, then the ink), cropped to the drawing plus `padding`; null for a blank page. */
export declare function renderPage(page: Page, doc: BoardDoc, scale?: number, padding?: number): HTMLCanvasElement | null
/** Draws items onto a (transparent) context in world coordinates; erase strokes cut through what came before. */
export declare function drawItems(ctx: CanvasRenderingContext2D, items: Item[], surface: Surface): void
export declare function drawItem(ctx: CanvasRenderingContext2D, item: Item, surface: Surface): void
/** Fills the board colour and its ruling for a view (screen space). */
export declare function drawSurface(
  ctx: CanvasRenderingContext2D,
  surface: Surface,
  pattern: Pattern,
  view: { x: number; y: number; zoom: number },
  width: number,
  height: number,
): void
/** Bounding box of one item in world coordinates. */
export declare function boundsOf(item: Item): { x: number; y: number; w: number; h: number }
/** Bounding box of the visible items, or null when there are none. */
export declare function contentBounds(items: Item[]): { x: number; y: number; w: number; h: number } | null
