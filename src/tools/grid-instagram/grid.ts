// Splits one photo into tiles. Pure maths: where each tile is cut from the source
// and the order to upload them in.

export type Mode = 'grid' | 'carousel'
export type TileRatio = '1:1' | '4:5' | '3:4'

export const TILE_RATIOS: Record<TileRatio, [number, number]> = { '1:1': [1, 1], '4:5': [4, 5], '3:4': [3, 4] }
export const TILE_WIDTH = 1080

export interface Tile {
  /** Position in the grid (0 = top-left), row by row. */
  index: number
  col: number
  row: number
  /** Source rectangle in the photo. */
  sx: number
  sy: number
  sw: number
  sh: number
  /** Output size in px. */
  w: number
  h: number
  /** 1 = upload first. A grid is posted last tile first, so the profile ends up in order. */
  order: number
}

export interface Plan {
  cols: number
  rows: number
  tiles: Tile[]
  /** The part of the photo that is used. */
  crop: { sx: number; sy: number; sw: number; sh: number }
}

/** The biggest rectangle of ratio `aspect` (w/h) inside the photo, centred and shifted by `focus` (0–1 per axis). */
export function coverRect(imgW: number, imgH: number, aspect: number, focusX = 0.5, focusY = 0.5) {
  let sw = imgW
  let sh = imgW / aspect
  if (sh > imgH) {
    sh = imgH
    sw = imgH * aspect
  }
  const sx = (imgW - sw) * Math.min(1, Math.max(0, focusX))
  const sy = (imgH - sh) * Math.min(1, Math.max(0, focusY))
  return { sx, sy, sw, sh }
}

/**
 * grid: `cols` × `rows` tiles of `ratio`; carousel: `cols` slides side by side, one row.
 * Tiles share one crop of the photo, so they join up seamlessly.
 */
export function planTiles(
  imgW: number,
  imgH: number,
  mode: Mode,
  cols: number,
  rows: number,
  ratio: TileRatio,
  focusX = 0.5,
  focusY = 0.5,
): Plan {
  const [rw, rh] = TILE_RATIOS[ratio]
  const r = mode === 'carousel' ? 1 : rows
  const crop = coverRect(imgW, imgH, (cols * rw) / (r * rh), focusX, focusY)
  const w = TILE_WIDTH
  const h = Math.round((TILE_WIDTH * rh) / rw)
  const tw = crop.sw / cols
  const th = crop.sh / r
  const total = cols * r
  const tiles: Tile[] = []
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      tiles.push({
        index,
        col,
        row,
        sx: crop.sx + col * tw,
        sy: crop.sy + row * th,
        sw: tw,
        sh: th,
        w,
        h,
        // Instagram shows the newest post top-left, so a grid goes up bottom-right first. A carousel goes left to right.
        order: mode === 'grid' ? total - index : index + 1,
      })
    }
  }
  return { cols, rows: r, tiles, crop }
}

export const tileName = (base: string, t: Tile, total: number, ext: string) =>
  `${base}-${String(t.order).padStart(String(total).length, '0')}.${ext}`
