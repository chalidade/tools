// Compresses a PDF while keeping its text as text (same method as
// toowl.my.id/tools/compress-pdf/, ported from the browser to Node):
//
// 1. qpdf dumps the PDF as JSON with every stream's raw bytes inline.
// 2. Each 8-bit RGB/Gray JPEG image is scaled down and re-encoded with sharp
//    (libvips/mozjpeg) — kept only when it got at least 10% smaller.
// 3. qpdf rebuilds the PDF from that JSON, recompressing every other stream
//    and packing objects into compressed object streams.
//
// The result is never bigger than the input.

import sharp from 'sharp'
import { runQpdf } from './qpdf.js'

export const LEVELS = {
  light: { maxSide: 2400, quality: 82 },
  medium: { maxSide: 1600, quality: 70 },
  strong: { maxSide: 1100, quality: 55 },
  extreme: { maxSide: 800, quality: 40 },
}

const OPTIMIZE = ['--object-streams=generate', '--compress-streams=y', '--recompress-flate', '--compression-level=9']

export class PdfError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function components(space, objects) {
  if (space === '/DeviceRGB') return 3
  if (space === '/DeviceGray') return 1
  if (Array.isArray(space) && space[0] === '/ICCBased' && typeof space[1] === 'string') {
    const n = objects[`obj:${space[1]}`]?.stream?.dict['/N']
    return n === 1 || n === 3 ? n : null
  }
  return null // CMYK, Lab, Indexed, separations: left alone
}

const isDct = (filter) =>
  filter === '/DCTDecode' || (Array.isArray(filter) && filter.length === 1 && filter[0] === '/DCTDecode')

async function shrinkJpeg(data, { maxSide, quality }, gray) {
  let img = sharp(data, { failOn: 'none' }).resize({
    width: maxSide,
    height: maxSide,
    fit: 'inside',
    withoutEnlargement: true,
  })
  if (gray) img = img.toColourspace('b-w')
  const { data: out, info } = await img
    .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer({ resolveWithObject: true })
  return { out, width: info.width, height: info.height, channels: info.channels }
}

/**
 * @param {Uint8Array} input PDF bytes
 * @param {{ level?: keyof LEVELS, maxSide?: number, quality?: number, password?: string }} options
 */
export async function compressPdf(input, options = {}) {
  const preset = LEVELS[options.level ?? 'medium'] ?? LEVELS.medium
  const settings = {
    maxSide: options.maxSide ?? preset.maxSide,
    quality: options.quality ?? preset.quality,
  }
  const pw = options.password ? [`--password=${options.password}`] : []

  const dump = await runQpdf(input, (i, o) => [...pw, i, '--json-output=2', '--json-stream-data=inline', '--decode-level=none', o])
  if (/invalid password/i.test(dump.log)) throw new PdfError('password', 'The PDF is password-protected (pass "password").')
  if (dump.code === 2 || !dump.output) throw new PdfError('read', 'Not a readable PDF: ' + dump.log.slice(0, 300))

  const json = JSON.parse(Buffer.from(dump.output).toString('utf8'))
  const objects = json.qpdf[1]

  const candidates = Object.values(objects).filter((o) => {
    const d = o.stream?.dict
    return (
      d && o.stream?.data && d['/Subtype'] === '/Image' && isDct(d['/Filter']) && d['/BitsPerComponent'] === 8 &&
      !d['/Decode'] && !d['/ImageMask'] && components(d['/ColorSpace'], objects) !== null
    )
  })

  let shrunk = 0
  for (const obj of candidates) {
    const stream = obj.stream
    const original = Buffer.from(stream.data, 'base64')
    try {
      const gray = components(stream.dict['/ColorSpace'], objects) === 1
      const { out, width, height, channels } = await shrinkJpeg(original, settings, gray)
      if (out.length >= original.length * 0.9) continue
      stream.data = out.toString('base64')
      stream.dict['/Width'] = width
      stream.dict['/Height'] = height
      stream.dict['/ColorSpace'] = channels === 1 ? '/DeviceGray' : '/DeviceRGB'
      delete stream.dict['/ColorTransform']
      delete stream.dict['/DecodeParms']
      delete stream.dict['/Length']
      shrunk++
    } catch {
      // sharp could not decode this JPEG: keep it as it is
    }
  }

  const rebuilt = shrunk
    ? await runQpdf(Buffer.from(JSON.stringify(json)), (i, o) => ['--json-input', i, ...OPTIMIZE, o])
    : await runQpdf(input, (i, o) => [...pw, i, ...OPTIMIZE, o])
  if (rebuilt.code === 2 || !rebuilt.output) throw new PdfError('write', 'Could not rebuild the PDF: ' + rebuilt.log.slice(0, 300))

  const smaller = rebuilt.output.length < input.length
  const output = smaller ? rebuilt.output : input
  return {
    output,
    before: input.length,
    after: output.length,
    imagesFound: candidates.length,
    imagesShrunk: shrunk,
    unchanged: !smaller,
  }
}
