// Word keeps many pictures (logos, charts pasted from Excel, clip art) as
// EMF/WMF metafiles, which no browser can draw: the <img> stayed empty. These
// are played back into SVG with rtf.js's EMF/WMF players (MIT), in the
// browser like everything else. The same pass gives pictures whose part had
// no content type ("application/octet-stream") their real image type, which
// Safari needs before it will show them.

const MM_ANISOTROPIC = 8

function bytesOf(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0 || !/;base64$/i.test(dataUrl.slice(0, comma))) return null
  const bin = atob(dataUrl.slice(comma + 1))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

type Kind = 'emf' | 'wmf' | 'image/png' | 'image/jpeg' | 'image/gif' | 'image/bmp' | 'image/webp' | 'image/tiff' | null

function sniff(b: Uint8Array): Kind {
  const u32 = (i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0
  if (b.length >= 44 && u32(0) === 1 && u32(40) === 0x464d4520) return 'emf' // " EMF"
  if (b.length >= 22 && u32(0) === 0x9ac6cdd7) return 'wmf' // placeable header
  if (b.length >= 18 && (b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0) return 'wmf'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp'
  if (u32(0) === 0x46464952 && u32(8) === 0x50424557) return 'image/webp'
  if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d)) return 'image/tiff'
  return null
}

function toSvgUrl(svg: SVGElement, box: [number, number, number, number]) {
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('viewBox', box.join(' '))
  svg.setAttribute('width', String(box[2]))
  svg.setAttribute('height', String(box[3]))
  // The players nest an <svg> per viewport change, sized to the viewport
  // extent rather than the drawing; left clipped, they cut the picture off.
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = 'svg svg { overflow: visible }'
  svg.prepend(style)
  const text = new XMLSerializer().serializeToString(svg)
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`
}

async function emfToSvg(b: Uint8Array) {
  const { Renderer, loggingEnabled } = await import('rtf.js/dist/EMFJS.bundle.js')
  loggingEnabled(false)
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  // EMR_HEADER: rclBounds (device units) at 8, the area the records draw in.
  const [l, t, r, bt] = [8, 12, 16, 20].map((o) => v.getInt32(o, true))
  const w = Math.max(1, r - l + 1)
  const h = Math.max(1, bt - t + 1)
  const svg = new Renderer(b.slice().buffer).render({ width: '100%', height: '100%', wExt: w, hExt: h, xExt: w, yExt: h, mapMode: MM_ANISOTROPIC })
  return toSvgUrl(svg, [l, t, w, h])
}

async function wmfToSvg(b: Uint8Array) {
  const { Renderer, loggingEnabled } = await import('rtf.js/dist/WMFJS.bundle.js')
  loggingEnabled(false)
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let w = 1000
  let h = 1000
  let x = 0
  let y = 0
  if (v.getUint32(0, true) === 0x9ac6cdd7) {
    // Placeable header: bounding box in logical units at 6.
    x = v.getInt16(6, true)
    y = v.getInt16(8, true)
    w = Math.max(1, v.getInt16(10, true) - x)
    h = Math.max(1, v.getInt16(12, true) - y)
  }
  const svg = new Renderer(b.slice().buffer).render({ width: '100%', height: '100%', xExt: w, yExt: h, mapMode: MM_ANISOTROPIC })
  return toSvgUrl(svg, [x, y, w, h])
}

/** Makes every picture under `root` drawable; a picture that cannot be played stays as it was. */
export async function fixPictures(root: ParentNode) {
  for (const img of root.querySelectorAll<HTMLImageElement>('img[src^="data:"]')) {
    const src = img.getAttribute('src')!
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(src)) continue
    try {
      const bytes = bytesOf(src)
      const kind = bytes && sniff(bytes)
      if (!bytes || !kind) continue
      if (kind === 'emf') img.src = await emfToSvg(bytes)
      else if (kind === 'wmf') img.src = await wmfToSvg(bytes)
      else img.src = `data:${kind};base64,${src.slice(src.indexOf(',') + 1)}`
    } catch {
      // A metafile the player does not understand: leave the empty picture.
    }
  }
}
