// A favicon set from one image, ported from the site's
// src/tools/favicon-generator/favicon.ts: PNGs at the sizes browsers, iOS and
// Android ask for, a multi-size favicon.ico and a web manifest.
import sharp from 'sharp'

/** Draws the icon at size×size. opts: { shape, fit, padding (0–0.4), background (hex or null) } */
export async function drawIcon(source, size, { shape, fit, padding, background }) {
  const inner = Math.max(1, Math.round(size * (1 - padding * 2)))
  const art = await sharp(source, { density: 600 })
    .resize(inner, inner, { fit: fit === 'cover' ? 'cover' : 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const offset = Math.round((size - inner) / 2)
  let icon = sharp({
    create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: art, left: offset, top: offset }])
  if (shape === 'circle' || shape === 'rounded') {
    const mask =
      shape === 'circle'
        ? `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`
        : `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}"/></svg>`
    icon = sharp(await icon.png().toBuffer()).composite([{ input: Buffer.from(mask), blend: 'dest-in' }])
  }
  return icon.png({ compressionLevel: 9 }).toBuffer()
}

/** favicon.ico holding PNG images (supported by every current browser). */
export function buildIco(pngs) {
  const headerSize = 6 + pngs.length * 16
  const out = Buffer.alloc(headerSize + pngs.reduce((n, p) => n + p.data.length, 0))
  out.writeUInt16LE(0, 0)
  out.writeUInt16LE(1, 2)
  out.writeUInt16LE(pngs.length, 4)
  let offset = headerSize
  pngs.forEach((p, i) => {
    const e = 6 + i * 16
    out[e] = p.size >= 256 ? 0 : p.size
    out[e + 1] = p.size >= 256 ? 0 : p.size
    out.writeUInt16LE(1, e + 4)
    out.writeUInt16LE(32, e + 6)
    out.writeUInt32LE(p.data.length, e + 8)
    out.writeUInt32LE(offset, e + 12)
    p.data.copy(out, offset)
    offset += p.data.length
  })
  return out
}

export const HTML_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`

/** Returns { files: [[name, Buffer]], manifest } */
export async function buildSet(source, opts, { appName, themeColor }) {
  const files = []
  const ico = []
  for (const size of [16, 32, 48]) ico.push({ size, data: await drawIcon(source, size, opts) })
  files.push(['favicon.ico', buildIco(ico)])
  files.push(['favicon-16x16.png', ico[0].data])
  files.push(['favicon-32x32.png', ico[1].data])
  // iOS paints transparency black and rounds corners itself: give it a full square.
  files.push(['apple-touch-icon.png', await drawIcon(source, 180, { ...opts, shape: 'square', background: opts.background ?? themeColor })])
  files.push(['android-chrome-192x192.png', await drawIcon(source, 192, opts)])
  files.push(['android-chrome-512x512.png', await drawIcon(source, 512, opts)])
  // Maskable: full-bleed background, artwork inside the 80% safe zone.
  files.push([
    'maskable-512x512.png',
    await drawIcon(source, 512, { ...opts, shape: 'square', padding: Math.max(opts.padding, 0.12), background: opts.background ?? themeColor }),
  ])
  const manifest = {
    name: appName,
    short_name: appName.slice(0, 12),
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    theme_color: themeColor,
    background_color: themeColor,
    display: 'standalone',
  }
  files.push(['site.webmanifest', Buffer.from(JSON.stringify(manifest, null, 2) + '\n')])
  files.push(['how-to-use.html', Buffer.from(HTML_SNIPPET + '\n')])
  return { files, manifest }
}
