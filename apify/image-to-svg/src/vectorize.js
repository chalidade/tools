// Image → SVG with VTracer (visioncortex, MIT) through `vtracer-wasm` (MIT),
// the same engine and settings as toowl's image-to-svg tool.
//
// This build feeds VTracer's internal ConverterConfig: corner and splice
// thresholds are radians, `colorPrecision` is the number of bits DROPPED per
// channel (0–7; 8 panics) and `filterSpeckle` is an area in pixels.
import { Worker } from 'node:worker_threads'
import sharp from 'sharp'

const rad = (deg) => (deg * Math.PI) / 180

export function vtracerConfig(o) {
  return {
    binary: o.mode === 'bw',
    mode: o.shape,
    hierarchical: 'stacked',
    cornerThreshold: rad(o.corner),
    lengthThreshold: 4,
    maxIterations: 10,
    spliceThreshold: rad(45),
    filterSpeckle: Math.max(1, Math.round(o.speckle * o.speckle)),
    colorPrecision: Math.min(7, Math.max(0, 8 - Math.round(o.detail) - 1)),
    layerDifference: Math.round(o.merge),
    pathPrecision: 2,
  }
}

/** Binary mode takes dark pixels as the shape: flatten alpha onto white, then threshold. */
function binarize(px, threshold, invert) {
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255
    const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) * a + 255 * (1 - a)
    const ink = invert ? lum >= threshold : lum < threshold
    const v = ink ? 0 : 255
    px[i] = px[i + 1] = px[i + 2] = v
    px[i + 3] = 255
  }
}

function trace(pixels, width, height, config, timeoutMs) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./trace-worker.js', import.meta.url), {
      workerData: { pixels, width, height, config },
      transferList: [pixels.buffer],
    })
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error(`Tracing took longer than ${Math.round(timeoutMs / 1000)} s; try a smaller "maxSize" or less detail.`))
    }, timeoutMs)
    worker.once('message', (m) => {
      clearTimeout(timer)
      worker.terminate()
      if (m.ok) resolve(m.svg)
      else reject(new Error(`Tracing failed: ${m.error}`))
    })
    worker.once('error', (e) => {
      clearTimeout(timer)
      reject(new Error(`Tracing failed: ${e.message}`))
    })
  })
}

/** Adds a viewBox (so the SVG scales), recolours a black-and-white trace, counts shapes. */
function finishSvg(svg, width, height, fill) {
  let out = svg.replace(/<svg ([^>]*?)width="(\d+)" height="(\d+)">/, (_m, attrs, w, h) => `<svg ${attrs}width="${w}" height="${h}" viewBox="0 0 ${w || width} ${h || height}">`)
  if (fill) out = out.replaceAll('fill="#000000"', `fill="${fill}"`)
  return { svg: out, shapes: out.match(/<path/g)?.length ?? 0 }
}

export async function vectorize(bytes, o) {
  let img = sharp(bytes, { failOn: 'none', limitInputPixels: 268e6 }).rotate()
  const meta = await img.metadata().catch(() => ({}))
  if (!meta.width) throw new Error('Not an image this Actor can read (PNG, JPG, WebP, AVIF, GIF, TIFF, BMP or SVG).')
  // VTracer's time grows fast with pixels: cap the longer side.
  img = img.resize({ width: o.maxSize, height: o.maxSize, fit: 'inside', withoutEnlargement: true })
  if (o.mode === 'color' && o.background) img = img.flatten({ background: o.background })
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const px = new Uint8Array(data.buffer, data.byteOffset, data.length).slice()
  if (o.mode === 'bw') binarize(px, o.threshold, o.invert)
  const raw = await trace(px, info.width, info.height, vtracerConfig(o), o.timeoutMs)
  const fill = o.mode === 'bw' && o.color && o.color !== '#000000' ? o.color : null
  const { svg, shapes } = finishSvg(raw, info.width, info.height, fill)
  return { svg, shapes, width: info.width, height: info.height, inputFormat: meta.format }
}
