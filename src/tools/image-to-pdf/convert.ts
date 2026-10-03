// Everything here runs in the visitor's browser: images are decoded from
// memory with createImageBitmap, drawn to a canvas, and placed on PDF pages by
// jsPDF. Nothing is uploaded. jsPDF is a dynamic import so it loads on use.

export type Rotation = 0 | 90 | 180 | 270

export interface ImageItem {
  id: string
  file: File
  /** Decoded size in pixels, before rotation. */
  width: number
  height: number
  rotation: Rotation
  /** Small rotated preview, as a JPEG data URL. */
  thumb: string
}

export type PageSize = 'a4' | 'letter' | 'fit'
export type Orientation = 'auto' | 'portrait' | 'landscape'

export interface PdfOptions {
  page: PageSize
  orientation: Orientation
  /** Space around the image, in points. */
  margin: number
}

export class UnsupportedImageError extends Error {
  fileName: string
  constructor(fileName: string) {
    super(fileName)
    this.fileName = fileName
  }
}

const PAGE_SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

/** "Fit to image" pages get this long side (same as A4), so they print sensibly. */
const FIT_LONG_SIDE = 841.89

/** Longest side, in pixels, an image keeps inside the PDF (≈ A4 at 300 dpi). */
const MAX_PIXELS = 3508

const THUMB_SIZE = 360

let nextId = 0

async function decode(file: File) {
  try {
    // 'from-image' applies EXIF orientation, so phone photos come out upright.
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new UnsupportedImageError(file.name)
  }
}

/** Width/height after applying a rotation. */
export function rotatedSize(item: Pick<ImageItem, 'width' | 'height' | 'rotation'>) {
  return item.rotation % 180 === 0 ? [item.width, item.height] : [item.height, item.width]
}

/** Draws `source` rotated onto a new canvas no larger than `maxSide`. */
function drawRotated(source: CanvasImageSource, width: number, height: number, rotation: Rotation, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const sideways = rotation % 180 !== 0

  const canvas = document.createElement('canvas')
  canvas.width = sideways ? h : w
  canvas.height = sideways ? w : h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // transparent PNG areas print white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(source, -w / 2, -h / 2, w, h)
  return canvas
}

export async function loadImage(file: File): Promise<ImageItem> {
  const bitmap = await decode(file)
  try {
    const thumb = drawRotated(bitmap, bitmap.width, bitmap.height, 0, THUMB_SIZE).toDataURL('image/jpeg', 0.8)
    return { id: `img-${nextId++}`, file, width: bitmap.width, height: bitmap.height, rotation: 0, thumb }
  } finally {
    bitmap.close()
  }
}

/** A new preview for the item at its new rotation, made from the existing preview. */
export async function rotateThumb(item: ImageItem, next: Rotation): Promise<string> {
  const img = new Image()
  img.src = item.thumb
  await img.decode()
  // The current thumb is already rotated by item.rotation; turn it by the difference.
  const delta = (((next - item.rotation) % 360) + 360) % 360 as Rotation
  return drawRotated(img, img.naturalWidth, img.naturalHeight, delta, THUMB_SIZE).toDataURL('image/jpeg', 0.8)
}

/**
 * Page size and image placement for one item, in points. Shared by the
 * on-screen preview and the PDF, so what you see is what you get.
 */
export function layout(item: Pick<ImageItem, 'width' | 'height' | 'rotation'>, opts: PdfOptions) {
  const [iw, ih] = rotatedSize(item)
  const landscapeImage = iw > ih

  let pageW: number
  let pageH: number
  if (opts.page === 'fit') {
    const scale = FIT_LONG_SIDE / Math.max(iw, ih)
    pageW = iw * scale + opts.margin * 2
    pageH = ih * scale + opts.margin * 2
  } else {
    const [short, long] = PAGE_SIZES[opts.page]
    const landscape = opts.orientation === 'auto' ? landscapeImage : opts.orientation === 'landscape'
    pageW = landscape ? long : short
    pageH = landscape ? short : long
  }

  const boxW = pageW - opts.margin * 2
  const boxH = pageH - opts.margin * 2
  const scale = Math.min(boxW / iw, boxH / ih)
  const w = iw * scale
  const h = ih * scale
  return { pageW, pageH, x: (pageW - w) / 2, y: (pageH - h) / 2, w, h }
}

export async function buildPdf(
  items: ImageItem[],
  opts: PdfOptions,
  onProgress: (done: number, total: number) => void,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  let pdf: InstanceType<typeof jsPDF> | null = null

  for (const [i, item] of items.entries()) {
    const bitmap = await decode(item.file)
    let data: string
    let format: 'PNG' | 'JPEG'
    try {
      const canvas = drawRotated(bitmap, bitmap.width, bitmap.height, item.rotation, MAX_PIXELS)
      // PNG stays lossless (screenshots, diagrams); everything else is a photo → JPEG.
      format = item.file.type === 'image/png' ? 'PNG' : 'JPEG'
      data = format === 'PNG' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92)
    } finally {
      bitmap.close()
    }

    const { pageW, pageH, x, y, w, h } = layout(item, opts)
    const orientation = pageW > pageH ? 'landscape' : 'portrait'
    if (!pdf) pdf = new jsPDF({ unit: 'pt', format: [pageW, pageH], orientation, compress: true })
    else pdf.addPage([pageW, pageH], orientation)
    pdf.addImage(data, format, x, y, w, h, undefined, 'FAST')

    onProgress(i + 1, items.length)
    // Let the progress render between pages on large batches.
    await new Promise((r) => setTimeout(r, 0))
  }

  return pdf!.output('blob')
}
