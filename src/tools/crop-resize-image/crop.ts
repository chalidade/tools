// Crop, rotate, flip, and resize one image in the visitor's browser with a
// canvas. Nothing is uploaded.

import { canvasBlob, newCanvas, type DecodedImage } from '@/lib/image'

export type Rotation = 0 | 90 | 180 | 270

export interface Orientation {
  rotation: Rotation
  flipX: boolean
  flipY: boolean
}

/** A rectangle in pixels of the oriented (rotated/flipped) image. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export type OutFormat = 'png' | 'jpeg' | 'webp'

const MIN = 8

/** Draws the image rotated and flipped, at full size. */
export function orient(image: DecodedImage, o: Orientation) {
  const sideways = o.rotation === 90 || o.rotation === 270
  const canvas = newCanvas(sideways ? image.height : image.width, sideways ? image.width : image.height)
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((o.rotation * Math.PI) / 180)
  ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1)
  ctx.drawImage(image.source, -image.width / 2, -image.height / 2)
  return canvas
}

/** The largest rectangle of `ratio` (w/h) centred in a W×H image; the whole image when ratio is null. */
export function fitRect(W: number, H: number, ratio: number | null): Rect {
  if (!ratio) return { x: 0, y: 0, w: W, h: H }
  let w = W
  let h = W / ratio
  if (h > H) {
    h = H
    w = H * ratio
  }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * The crop box after dragging `handle` by (dx, dy) image pixels from
 * `start`. Edges stay inside the W×H image; with a ratio, the box keeps it,
 * anchored on the opposite corner or edge.
 */
export function dragRect(start: Rect, handle: Handle, dx: number, dy: number, ratio: number | null, W: number, H: number): Rect {
  if (handle === 'move') {
    return { ...start, x: clamp(start.x + dx, 0, W - start.w), y: clamp(start.y + dy, 0, H - start.h) }
  }
  let left = start.x
  let top = start.y
  let right = start.x + start.w
  let bottom = start.y + start.h
  if (handle.includes('w')) left = clamp(left + dx, 0, right - MIN)
  if (handle.includes('e')) right = clamp(right + dx, left + MIN, W)
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - MIN)
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + MIN, H)
  if (!ratio) return { x: left, y: top, w: right - left, h: bottom - top }

  let w = right - left
  let h = bottom - top
  if (handle.length === 2) {
    // Corner: follow whichever side was pulled further, then fit the room left.
    w = Math.max(w, h * ratio)
    h = w / ratio
    const roomW = handle.includes('w') ? right : W - left
    const roomH = handle.includes('n') ? bottom : H - top
    if (w > roomW) [w, h] = [roomW, roomW / ratio]
    if (h > roomH) [w, h] = [roomH * ratio, roomH]
    if (handle.includes('w')) left = right - w
    if (handle.includes('n')) top = bottom - h
    return { x: left, y: top, w, h }
  }
  if (handle === 'e' || handle === 'w') {
    // Side edge: height follows, centred on where it was.
    const cy = start.y + start.h / 2
    h = w / ratio
    if (h > H) [w, h] = [H * ratio, H]
    if (handle === 'w') left = right - w
    return { x: left, y: clamp(cy - h / 2, 0, H - h), w, h }
  }
  const cx = start.x + start.w / 2
  w = h * ratio
  if (w > W) [w, h] = [W, W / ratio]
  if (handle === 'n') top = bottom - h
  return { x: clamp(cx - w / 2, 0, W - w), y: top, w, h }
}

export async function exportImage(
  oriented: HTMLCanvasElement,
  crop: Rect,
  size: { w: number; h: number },
  format: OutFormat,
  quality: number,
) {
  const canvas = newCanvas(size.w, size.h)
  const ctx = canvas.getContext('2d')!
  if (format === 'jpeg') {
    // JPEG has no transparency: transparent areas become white, not black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(oriented, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height)
  const blob = await canvasBlob(canvas, `image/${format}`, format === 'png' ? undefined : quality)
  canvas.width = canvas.height = 0
  return blob
}
