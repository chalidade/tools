// Draws watermarks onto a 2D context; shared by the live preview (main thread)
// and the batch worker.

import { placeMarks, type LayoutOpts } from './layout'

export interface MarkOpts extends LayoutOpts {
  kind: 'text' | 'logo'
  text: string
  color: 'white' | 'black'
  /** Width of one mark, % of the photo's width. */
  size: number
  /** 0–100. */
  opacity: number
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const FONT = '700 100px system-ui, "Segoe UI", Helvetica, Arial, sans-serif'

export interface Logo {
  source: CanvasImageSource
  width: number
  height: number
}

/** Draws `photo` at W × H and the watermark over it. */
export function renderMarked(ctx: Ctx, photo: CanvasImageSource, W: number, H: number, o: MarkOpts, logo: Logo | null) {
  ctx.globalAlpha = 1
  ctx.drawImage(photo, 0, 0, W, H)
  const targetW = Math.max(8, (W * o.size) / 100)
  let mw: number
  let mh: number
  let fontScale = 1
  if (o.kind === 'logo') {
    if (!logo) return
    mw = targetW
    mh = (targetW * logo.height) / logo.width
  } else {
    const text = o.text.trim()
    if (!text) return
    ctx.font = FONT
    const w100 = ctx.measureText(text).width || 1
    fontScale = targetW / w100
    mw = targetW
    mh = 100 * fontScale * 1.1
  }
  const marks = placeMarks(W, H, mw, mh, o)
  ctx.globalAlpha = Math.min(1, Math.max(0, o.opacity / 100))
  for (const m of marks) {
    ctx.save()
    ctx.translate(m.x, m.y)
    ctx.rotate(m.angle)
    if (o.kind === 'logo' && logo) {
      ctx.drawImage(logo.source, -mw / 2, -mh / 2, mw, mh)
    } else {
      ctx.font = FONT
      ctx.scale(fontScale, fontScale)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 7
      ctx.strokeStyle = o.color === 'white' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'
      ctx.strokeText(o.text.trim(), 0, 0)
      ctx.fillStyle = o.color === 'white' ? '#fff' : '#000'
      ctx.fillText(o.text.trim(), 0, 0)
    }
    ctx.restore()
  }
  ctx.globalAlpha = 1
}
