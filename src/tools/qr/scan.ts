// Reads QR codes and barcodes in the visitor's browser with zxing-wasm
// (ZXing-C++ compiled to WebAssembly). The ~950 KB wasm is bundled with the
// site and loaded only when a scan is first needed; nothing goes to a CDN,
// and no picture leaves the device.

import type { ReaderOptions } from 'zxing-wasm/reader'
import { decodeImage, newCanvas, UnreadableImageError } from '@/lib/image'

export { UnreadableImageError }

export interface Scan {
  text: string
  /** "QRCode", "EAN13", "Code128"… */
  format: string
}

let ready: Promise<typeof import('zxing-wasm/reader')> | null = null
function zxing() {
  ready ??= Promise.all([import('zxing-wasm/reader'), import('zxing-wasm/reader/zxing_reader.wasm?url')]).then(
    ([lib, wasm]) => {
      // By default the library fetches its wasm from jsDelivr; point it at our own copy.
      lib.prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasm.default : prefix + path) },
      })
      return lib
    },
  )
  return ready
}

const ANY: ReaderOptions = { tryHarder: true, tryInvert: true, tryRotate: true, tryDownscale: true, maxNumberOfSymbols: 8 }
const QR_ONLY: ReaderOptions = { ...ANY, formats: ['QRCode'], maxNumberOfSymbols: 1 }

export async function scanPixels(data: Uint8ClampedArray, width: number, height: number, onlyQr = false): Promise<Scan[]> {
  const { readBarcodes } = await zxing()
  const results = await readBarcodes(new ImageData(new Uint8ClampedArray(data), width, height), onlyQr ? QR_ONLY : ANY)
  return results.filter((r) => r.isValid).map((r) => ({ text: r.text, format: r.format }))
}

const FORMAT_NAMES: Record<string, string> = {
  QRCode: 'QR code',
  MicroQRCode: 'Micro QR',
  RMQRCode: 'rMQR',
  DataMatrix: 'Data Matrix',
  Aztec: 'Aztec',
  PDF417: 'PDF417',
  EAN13: 'Barcode EAN-13',
  EAN8: 'Barcode EAN-8',
  UPCA: 'Barcode UPC-A',
  UPCE: 'Barcode UPC-E',
  Code128: 'Barcode Code 128',
  Code39: 'Barcode Code 39',
  Code93: 'Barcode Code 93',
  ITF: 'Barcode ITF',
  Codabar: 'Barcode Codabar',
}
export const formatName = (format: string) => FORMAT_NAMES[format] ?? `Kode ${format}`
export const isQrLike = (format: string) => /QR|Aztec|DataMatrix|PDF417|MaxiCode/i.test(format)

/** Every code found in a picture (EXIF rotation applied; very large photos scaled to 3000 px). */
export async function scanFile(file: File): Promise<Scan[]> {
  const image = await decodeImage(file)
  try {
    const long = Math.max(image.width, image.height)
    for (const side of new Set([Math.min(long, 3000), Math.min(long, 1000)])) {
      const k = side / long
      const canvas = newCanvas(image.width * k, image.height * k)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      // A white base, so a transparent PNG's code is not black on black.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height)
      const found = await scanPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
      if (found.length) return found
    }
    return []
  } finally {
    image.close()
  }
}
