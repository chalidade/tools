// Reads QR codes and barcodes with zxing-wasm (ZXing-C++ compiled to wasm,
// MIT/Apache-2.0). Same engine and settings as toowl.my.id/tools/qr-reader/.
// The wasm is loaded from node_modules, never from a CDN.

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'

const require = createRequire(import.meta.url)
const WASM = require.resolve('zxing-wasm/reader/zxing_reader.wasm')

prepareZXingModule({
  overrides: { wasmBinary: readFileSync(WASM) },
  fireImmediately: false,
})

const ANY = { tryHarder: true, tryInvert: true, tryRotate: true, tryDownscale: true, maxNumberOfSymbols: 16 }

async function scanAt(bytes, side, options) {
  const { data, info } = await sharp(bytes, { failOn: 'none', limitInputPixels: 268_402_689 })
    .rotate()
    .flatten({ background: '#ffffff' }) // a transparent PNG's code is not black on black
    .resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const imageData = { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height, colorSpace: 'srgb' }
  const found = await readBarcodes(imageData, options)
  const meta = await sharp(bytes, { failOn: 'none' }).metadata()
  const k = Math.max(meta.width ?? info.width, meta.height ?? info.height) / Math.max(info.width, info.height)
  return { found: found.filter((r) => r.isValid), k }
}

/**
 * Every code in a picture. Tries the picture at up to 3000 px, then at
 * 1000 px (small codes in big photos often read better scaled down).
 * @param {Buffer} bytes
 * @param {{ formats?: string[] }} o  zxing format names, e.g. ["QRCode", "EAN13"]; empty = all
 */
export async function scanImage(bytes, o = {}) {
  if (bytes.length > 12 && bytes.toString('latin1', 4, 8) === 'ftyp' && !/avif|avis/.test(bytes.toString('latin1', 8, 12))) {
    throw new Error('HEIC/HEIF photos are not supported here: convert them to JPG first (e.g. with the Image Converter Actor).')
  }
  const options = { ...ANY, ...(o.formats?.length ? { formats: o.formats } : {}) }
  for (const side of [3000, 1000]) {
    const { found, k } = await scanAt(bytes, side, options)
    if (found.length) {
      return found.map((r) => ({
        text: r.text,
        format: r.format,
        contentType: r.contentType,
        isGs1: r.isGS1 ?? undefined,
        ecLevel: r.ecLevel || undefined,
        // corners in the picture's original pixel space
        position: corners(r.position, k),
      }))
    }
  }
  return []
}

function corners(position, k) {
  if (!position) return undefined
  const p = (pt) => ({ x: Math.round(pt.x * k), y: Math.round(pt.y * k) })
  return { topLeft: p(position.topLeft), topRight: p(position.topRight), bottomRight: p(position.bottomRight), bottomLeft: p(position.bottomLeft) }
}
