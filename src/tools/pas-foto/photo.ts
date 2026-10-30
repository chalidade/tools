// The ID photo itself: the picture fitted into the frame, with its backdrop
// swapped for a plain colour. Canvas only; nothing is uploaded.

import { newCanvas, type DecodedImage } from '@/lib/image'
import { applyRegion, compose, floodRegion, refine } from '../remove-background/mask'

export type Bg = 'red' | 'blue' | 'white' | 'keep'
export const BG_COLOR: Record<Exclude<Bg, 'keep'>, string> = { red: '#d71920', blue: '#1b5fc4', white: '#ffffff' }

/**
 * Draws the photo into the frame (cover fit, zoomed and panned), then swaps
 * the background: flood fill from the top corners and top edge picks the
 * backdrop, the soft edge is blended onto the chosen colour.
 */
export function renderPhoto(
  img: DecodedImage,
  W: number,
  H: number,
  view: { zoom: number; ox: number; oy: number },
  bg: Bg,
  tolerance: number,
) {
  const canvas = newCanvas(W, H)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  const s = Math.max(W / img.width, H / img.height) * view.zoom
  const dw = img.width * s
  const dh = img.height * s
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(img.source, W / 2 + view.ox - dw / 2, H / 2 + view.oy - dh / 2, dw, dh)
  if (bg === 'keep') return canvas

  const data = ctx.getImageData(0, 0, W, H)
  const mask = new Uint8Array(W * H).fill(255)
  const seeds = [
    [1, 1],
    [W - 2, 1],
    [Math.floor(W / 2), 1],
    [Math.floor(W / 4), 1],
    [Math.floor((W * 3) / 4), 1],
  ]
  for (const [x, y] of seeds) applyRegion(mask, floodRegion(data.data, W, H, x, y, tolerance), 'erase')
  const soft = refine(mask, W, H, 1, 1)
  const rgba = compose(data.data, soft, 'result')
  const fg = newCanvas(W, H)
  fg.getContext('2d')!.putImageData(new ImageData(rgba, W, H), 0, 0)
  ctx.fillStyle = BG_COLOR[bg]
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(fg, 0, 0)
  return canvas
}
