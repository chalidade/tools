// Sizes and sheet layout for ID photos. Pure arithmetic, in millimetres.

export const DPI = 300
export const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI)

export interface PhotoSize {
  id: string
  /** Width × height in cm, as people say it ("3×4"). */
  w: number
  h: number
}
export const SIZES: PhotoSize[] = [
  { id: '2x3', w: 2, h: 3 },
  { id: '3x4', w: 3, h: 4 },
  { id: '4x6', w: 4, h: 6 },
]

export interface Paper {
  id: string
  label: string
  /** Portrait width × height in mm. */
  w: number
  h: number
}
export const PAPERS: Paper[] = [
  { id: '4r', label: '4R (10×15 cm)', w: 102, h: 152 },
  { id: 'a4', label: 'A4', w: 210, h: 297 },
]

export interface Sheet {
  /** Paper as laid out (landscape when that fits more photos). */
  paperW: number
  paperH: number
  cols: number
  rows: number
  /** Top-left corner of every photo, in mm. */
  cells: { x: number; y: number }[]
}

const fit = (avail: number, size: number, gap: number) => Math.max(0, Math.floor((avail + gap) / (size + gap)))

/**
 * Packs as many photos of `photoW`×`photoH` mm as fit on the paper, in the
 * orientation that holds more, centred. `count` caps how many are placed.
 */
export function sheetLayout(paper: Paper, photoW: number, photoH: number, count: number, margin = 5, gap = 2): Sheet {
  const options = [
    { paperW: paper.w, paperH: paper.h },
    { paperW: paper.h, paperH: paper.w },
  ].map((o) => {
    const cols = fit(o.paperW - 2 * margin, photoW, gap)
    const rows = fit(o.paperH - 2 * margin, photoH, gap)
    return { ...o, cols, rows }
  })
  const best = options[1].cols * options[1].rows > options[0].cols * options[0].rows ? options[1] : options[0]
  const { paperW, paperH, cols, rows } = best
  const total = Math.min(count, cols * rows)
  const usedCols = Math.min(cols, total)
  const usedRows = Math.ceil(total / Math.max(1, cols))
  const blockW = usedCols * photoW + (usedCols - 1) * gap
  const blockH = usedRows * photoH + (usedRows - 1) * gap
  const x0 = (paperW - blockW) / 2
  const y0 = usedRows === rows ? (paperH - blockH) / 2 : margin
  const cells: Sheet['cells'] = []
  for (let i = 0; i < total; i++) {
    cells.push({ x: x0 + (i % cols) * (photoW + gap), y: y0 + Math.floor(i / cols) * (photoH + gap) })
  }
  return { paperW, paperH, cols, rows, cells }
}
