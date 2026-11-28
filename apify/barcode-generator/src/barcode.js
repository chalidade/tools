// Barcode drawing through bwip-js (MIT, BWIPP port): PNG via its own encoder,
// SVG as vector paths (text included), no native dependencies.
import bwipjs from 'bwip-js'

/** Types offered in the input, mapped to bwip-js encoder ids. */
export const TYPES = {
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  upce: 'upce',
  isbn: 'isbn',
  code128: 'code128',
  code39: 'code39',
  code93: 'code93',
  itf14: 'itf14',
  interleaved2of5: 'interleaved2of5',
  'gs1-128': 'gs1-128',
  codabar: 'rationalizedCodabar',
  datamatrix: 'datamatrix',
  pdf417: 'pdf417',
  azteccode: 'azteccode',
  qrcode: 'qrcode',
}

const TWO_D = new Set(['datamatrix', 'pdf417', 'azteccode', 'qrcode'])

/** Guess the symbology from the content: retail numbers by length, everything else Code 128. */
export function autoType(text) {
  if (/^\d{13}$/.test(text)) return 'ean13'
  if (/^\d{12}$/.test(text)) return 'upca'
  if (/^\d{8}$/.test(text)) return 'ean8'
  if (/^\d{14}$/.test(text)) return 'itf14'
  if (/^97[89]\d{10}$/.test(text)) return 'isbn'
  return 'code128'
}

const hex = (c) => c.replace(/^#/, '').slice(0, 6)

/**
 * @param {string} text
 * @param {{ type: string, scale: number, height: number, includeText: boolean, fg: string, bg: string|null, padding: number }} o
 */
export function options(text, o) {
  const bcid = TYPES[o.type]
  if (!bcid) throw new Error(`Unknown barcode type "${o.type}".`)
  const twoD = TWO_D.has(o.type)
  const opts = {
    bcid,
    text,
    scale: o.scale,
    includetext: o.includeText && !twoD,
    barcolor: hex(o.fg),
    textcolor: hex(o.fg),
    paddingwidth: o.padding,
    paddingheight: o.padding,
  }
  if (!twoD) opts.height = o.height
  if (o.bg) opts.backgroundcolor = hex(o.bg)
  if (o.type === 'gs1-128' && !/^\(\d{2,4}\)/.test(text)) throw new Error('GS1-128 needs application identifiers in brackets, e.g. (01)09501101530003(17)250101.')
  return opts
}

/** bwip-js errors look like "bwipp.ean13badLength: EAN-13 must be 12 or 13 digits". */
export function cleanError(e) {
  const msg = String(e?.message ?? e)
  return msg.replace(/^bwip(p|-js)\.[\w#]+:\s*/, '')
}

export async function toPng(opts) {
  return bwipjs.toBuffer(opts)
}

export function toSvg(opts) {
  return bwipjs.toSVG(opts)
}
