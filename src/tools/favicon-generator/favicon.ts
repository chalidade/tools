// Builds a favicon set in the visitor's browser: PNGs at the sizes browsers,
// iOS, and Android ask for, a multi-size favicon.ico, and a web manifest,
// zipped together. Nothing is uploaded.

import { tr } from '@/lib/i18n'
import { canvasBlob, newCanvas, type DecodedImage } from '@/lib/image'

export type Shape = 'square' | 'rounded' | 'circle'
export type Fit = 'contain' | 'cover'

export interface FaviconOptions {
  /** Image source, or null to draw `text`. */
  image: DecodedImage | null
  text: string
  textColor: string
  /** null = transparent. */
  background: string | null
  shape: Shape
  fit: Fit
  /** Empty space around the artwork, as a fraction of the icon size. */
  padding: number
}

/** Draws the icon at `size`×`size`. `forceBackground` fills transparency (iOS shows it black otherwise). */
export function drawIcon(size: number, opts: FaviconOptions, forceBackground?: string): HTMLCanvasElement {
  const canvas = newCanvas(size, size)
  const ctx = canvas.getContext('2d')!
  const background = opts.background ?? forceBackground ?? null

  ctx.save()
  // Clip to the shape, then paint background and artwork inside it.
  ctx.beginPath()
  if (opts.shape === 'circle') ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  else if (opts.shape === 'rounded') ctx.roundRect(0, 0, size, size, size * 0.22)
  else ctx.rect(0, 0, size, size)
  ctx.clip()
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size, size)
  }

  const inner = size * (1 - opts.padding * 2)
  const offset = (size - inner) / 2
  if (opts.image) {
    const { source, width, height } = opts.image
    const scale = opts.fit === 'cover' ? Math.max(inner / width, inner / height) : Math.min(inner / width, inner / height)
    const w = width * scale
    const h = height * scale
    ctx.imageSmoothingQuality = 'high'
    if (opts.fit === 'cover') {
      ctx.beginPath()
      ctx.rect(offset, offset, inner, inner)
      ctx.clip()
    }
    ctx.drawImage(source, (size - w) / 2, (size - h) / 2, w, h)
  } else if (opts.text.trim()) {
    const text = opts.text.trim()
    ctx.fillStyle = opts.textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    // Start big and shrink until the text fits the inner box.
    let fontSize = inner
    const font = (px: number) => `700 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
    ctx.font = font(fontSize)
    let m = ctx.measureText(text)
    const fit = () => Math.min(inner / m.width, inner / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent))
    fontSize *= Math.min(1, fit())
    ctx.font = font(fontSize)
    m = ctx.measureText(text)
    // Centre the ink box, not the em box, so letters and emoji sit in the middle.
    const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    const y = size / 2 + inkH / 2 - m.actualBoundingBoxDescent
    const x = size / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2
    ctx.fillText(text, x, y)
  }
  ctx.restore()
  return canvas
}

/** favicon.ico holding PNG images (supported by every browser since IE Vista-era). */
export function buildIco(pngs: { size: number; data: Uint8Array }[]) {
  const headerSize = 6 + pngs.length * 16
  const total = headerSize + pngs.reduce((n, p) => n + p.data.length, 0)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // type: icon
  view.setUint16(4, pngs.length, true)
  let offset = headerSize
  pngs.forEach((p, i) => {
    const entry = 6 + i * 16
    out[entry] = p.size >= 256 ? 0 : p.size // 0 means 256
    out[entry + 1] = p.size >= 256 ? 0 : p.size
    out[entry + 2] = 0 // palette colours
    out[entry + 3] = 0 // reserved
    view.setUint16(entry + 4, 1, true) // colour planes
    view.setUint16(entry + 6, 32, true) // bits per pixel
    view.setUint32(entry + 8, p.data.length, true)
    view.setUint32(entry + 12, offset, true)
    out.set(p.data, offset)
    offset += p.data.length
  })
  return out
}

const pngBytes = async (canvas: HTMLCanvasElement) => new Uint8Array(await (await canvasBlob(canvas)).arrayBuffer())

export const HTML_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`

export async function buildFaviconZip(opts: FaviconOptions, appName: string, themeColor: string) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  const ico = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await pngBytes(drawIcon(size, opts)) })))
  zip.file('favicon.ico', buildIco(ico))
  zip.file('favicon-16x16.png', ico[0].data)
  zip.file('favicon-32x32.png', ico[1].data)
  // iOS draws transparent pixels black and rounds corners itself: give it a full square.
  zip.file('apple-touch-icon.png', await pngBytes(drawIcon(180, { ...opts, shape: 'square' }, themeColor)))
  zip.file('android-chrome-192x192.png', await pngBytes(drawIcon(192, opts)))
  zip.file('android-chrome-512x512.png', await pngBytes(drawIcon(512, opts)))
  zip.file(
    'site.webmanifest',
    JSON.stringify(
      {
        name: appName,
        short_name: appName,
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        theme_color: themeColor,
        background_color: themeColor,
        display: 'standalone',
      },
      null,
      2,
    ) + '\n',
  )
  zip.file(tr('cara-pakai.html', 'how-to-use.html'), HTML_SNIPPET + '\n')
  return zip.generateAsync({ type: 'blob' })
}
