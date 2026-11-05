// Draws text, images, shapes, ticks and scribbles onto PDF pages (pdf-lib).
// Every coordinate is in points on the page as shown (after /Rotate), measured
// from its top-left corner — the same space as the preview's SVG viewBox, so
// what you see is where it lands.

import type { PDFFont } from 'pdf-lib'
import { openPdfDoc, pdfBlob, uprightPage } from '@/lib/pdf-doc'

export type FontKey = 'sans' | 'serif' | 'mono'
export type Pt = [number, number]

interface Base {
  id: string
  page: number
  color: string
}

export type Item = Base &
  (
    | { kind: 'text'; x: number; y: number; text: string; size: number; font: FontKey; bold: boolean }
    | { kind: 'rect'; x: number; y: number; w: number; h: number; stroke: number; fill: boolean }
    | { kind: 'line'; x: number; y: number; x2: number; y2: number; stroke: number }
    | { kind: 'check'; x: number; y: number; size: number }
    | { kind: 'draw'; points: Pt[]; stroke: number }
    | { kind: 'image'; x: number; y: number; w: number; imageId: string }
  )

export interface PickedImage {
  id: string
  bytes: Uint8Array
  mime: 'image/png' | 'image/jpeg'
  url: string
  width: number
  height: number
}

/** Tick mark as a polyline inside a unit square. */
export const CHECK_PATH: Pt[] = [
  [0.12, 0.55],
  [0.4, 0.82],
  [0.88, 0.16],
]

export const LINE_HEIGHT = 1.2

export const FONT_CSS: Record<FontKey, string> = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: '"Times New Roman", Times, serif',
  mono: '"Courier New", Courier, monospace',
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Rough width of a text item (preview hit box only; export measures the real font). */
export function textBox(item: Extract<Item, { kind: 'text' }>) {
  const lines = item.text.split('\n')
  const widest = Math.max(1, ...lines.map((l) => l.length))
  const factor = item.font === 'mono' ? 0.6 : 0.52
  return { w: widest * item.size * factor, h: lines.length * item.size * LINE_HEIGHT }
}

/** Bounding box of an item, for selection outlines and dragging limits. */
export function bounds(item: Item, imgAspect = 1): { x: number; y: number; w: number; h: number } {
  switch (item.kind) {
    case 'text': {
      const b = textBox(item)
      return { x: item.x, y: item.y - item.size, w: b.w, h: b.h }
    }
    case 'rect':
      return { x: item.x, y: item.y, w: item.w, h: item.h }
    case 'line':
      return {
        x: Math.min(item.x, item.x2),
        y: Math.min(item.y, item.y2),
        w: Math.abs(item.x2 - item.x),
        h: Math.abs(item.y2 - item.y),
      }
    case 'check':
      return { x: item.x, y: item.y, w: item.size, h: item.size }
    case 'draw': {
      const xs = item.points.map((p) => p[0])
      const ys = item.points.map((p) => p[1])
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
    }
    case 'image':
      return { x: item.x, y: item.y, w: item.w, h: item.w * imgAspect }
  }
}

/** Moves an item by (dx, dy) points, keeping it inside the page. */
export function moveItem(item: Item, dx: number, dy: number, pageW: number, pageH: number, imgAspect = 1): Item {
  const b = bounds(item, imgAspect)
  const mx = clamp(dx, -b.x, pageW - b.w - b.x)
  const my = clamp(dy, -b.y, pageH - b.h - b.y)
  switch (item.kind) {
    case 'line':
      return { ...item, x: item.x + mx, y: item.y + my, x2: item.x2 + mx, y2: item.y2 + my }
    case 'draw':
      return { ...item, points: item.points.map(([x, y]) => [x + mx, y + my] as Pt) }
    default:
      return { ...item, x: item.x + mx, y: item.y + my }
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = m ? parseInt(m[1], 16) : 0
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Drops characters the standard (WinAnsi) PDF fonts cannot draw. */
export function safeText(font: PDFFont, text: string) {
  let out = ''
  for (const ch of text) {
    if (ch === '\n') {
      out += ch
      continue
    }
    try {
      font.encodeText(ch)
      out += ch
    } catch {
      out += '?'
    }
  }
  return out
}

export const hasUnsupported = (text: string) => /[^\n -~ -ÿ–—‘’“”•…€]/.test(text)

export async function readImage(file: File): Promise<PickedImage> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  let blob: Blob = file
  let mime: PickedImage['mime'] = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    // WebP/GIF/etc.: redraw as PNG, since PDFs embed only PNG and JPEG here.
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/png'))
    mime = 'image/png'
  }
  bitmap.close()
  return {
    id: crypto.randomUUID(),
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mime,
    url: URL.createObjectURL(blob),
    width,
    height,
  }
}

export async function editPdf(file: File, items: Item[], images: PickedImage[]) {
  const pdf = await import('pdf-lib')
  const { rgb, StandardFonts, LineCapStyle } = pdf
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const pages = doc.getPages()

  const fontNames: Record<FontKey, [string, string]> = {
    sans: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
    serif: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
    mono: [StandardFonts.Courier, StandardFonts.CourierBold],
  }
  const fonts = new Map<string, PDFFont>()
  const fontFor = async (key: FontKey, bold: boolean) => {
    const name = fontNames[key][bold ? 1 : 0]
    let f = fonts.get(name)
    if (!f) fonts.set(name, (f = await doc.embedFont(name)))
    return f
  }
  const embedded = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>()
  const imageFor = async (id: string) => {
    const hit = embedded.get(id)
    if (hit) return hit
    const src = images.find((i) => i.id === id)
    if (!src) return null
    const img = src.mime === 'image/jpeg' ? await doc.embedJpg(src.bytes) : await doc.embedPng(src.bytes)
    embedded.set(id, img)
    return img
  }

  for (const [pageIndex, page] of pages.entries()) {
    const mine = items.filter((i) => i.page === pageIndex + 1)
    if (!mine.length) continue
    const view = await uprightPage(page)
    // Collect first: embedding is async, but drawing inside upright() is not.
    const jobs: (() => void)[] = []
    const Y = (y: number) => view.height - y
    for (const it of mine) {
      const color = rgb(...hexToRgb(it.color))
      const line = (a: Pt, b: Pt, thickness: number) =>
        page.drawLine({
          start: { x: a[0], y: Y(a[1]) },
          end: { x: b[0], y: Y(b[1]) },
          thickness,
          color,
          lineCap: LineCapStyle.Round,
        })
      switch (it.kind) {
        case 'text': {
          const font = await fontFor(it.font, it.bold)
          const lines = safeText(font, it.text).split('\n')
          jobs.push(() =>
            lines.forEach((l, n) => {
              if (l) page.drawText(l, { x: it.x, y: Y(it.y + n * it.size * LINE_HEIGHT), size: it.size, font, color })
            }),
          )
          break
        }
        case 'rect':
          jobs.push(() =>
            page.drawRectangle({
              x: it.x,
              y: Y(it.y + it.h),
              width: it.w,
              height: it.h,
              ...(it.fill ? { color } : { borderColor: color, borderWidth: it.stroke }),
            }),
          )
          break
        case 'line':
          jobs.push(() => line([it.x, it.y], [it.x2, it.y2], it.stroke))
          break
        case 'check':
          jobs.push(() => {
            const pts = CHECK_PATH.map(([u, v]) => [it.x + u * it.size, it.y + v * it.size] as Pt)
            const t = Math.max(1, it.size * 0.12)
            line(pts[0], pts[1], t)
            line(pts[1], pts[2], t)
          })
          break
        case 'draw':
          jobs.push(() => {
            const p = it.points
            if (p.length === 1) line(p[0], [p[0][0] + 0.01, p[0][1]], it.stroke)
            for (let n = 1; n < p.length; n++) line(p[n - 1], p[n], it.stroke)
          })
          break
        case 'image': {
          const img = await imageFor(it.imageId)
          if (!img) break
          const h = (it.w * img.height) / img.width
          jobs.push(() => page.drawImage(img, { x: it.x, y: Y(it.y + h), width: it.w, height: h }))
          break
        }
      }
    }
    view.upright(() => jobs.forEach((j) => j()))
  }
  return pdfBlob(doc)
}
