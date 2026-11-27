// Background removal with IS-Net (DIS, "isnet-general-use", Apache-2.0) run by
// ONNX Runtime on the CPU. The model (~170 MB) is downloaded into the image at
// build time (see Dockerfile), not kept in git. The model sees a 1024×1024 copy
// and returns a saliency map, which becomes the alpha channel at full size.

import os from 'node:os'
import { fileURLToPath } from 'node:url'
import * as ort from 'onnxruntime-node'
import sharp from 'sharp'

const MODEL = process.env.TOOWL_MODEL || fileURLToPath(new URL('../model/isnet-general-use.onnx', import.meta.url))
const SIZE = 1024
const MAX_PIXELS = 40_000_000

let session = null
function loadSession() {
  session ??= ort.InferenceSession.create(MODEL, {
    graphOptimizationLevel: 'all',
    intraOpNumThreads: Math.max(1, os.availableParallelism?.() ?? os.cpus().length),
  })
  return session
}

const FORMATS = {
  png: { ext: 'png', mime: 'image/png', alpha: true, apply: (s) => s.png({ compressionLevel: 9, adaptiveFiltering: true }) },
  webp: { ext: 'webp', mime: 'image/webp', alpha: true, apply: (s, q) => s.webp({ quality: q, alphaQuality: 100, effort: 4 }) },
  jpg: { ext: 'jpg', mime: 'image/jpeg', alpha: false, apply: (s, q) => s.jpeg({ quality: q, mozjpeg: true }) },
}

/** 8-bit grey mask (W×H) of the subject: 255 = keep. */
async function subjectMask(rgb, W, H, { threshold }) {
  const sess = await loadSession()
  // Model input: RGB scaled to 1024², divided by its max, minus 0.5 (std 1).
  const small = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
    .resize(SIZE, SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer()
  let max = 1
  for (const v of small) if (v > max) max = v
  const n = SIZE * SIZE
  const input = new Float32Array(3 * n)
  for (let i = 0, p = 0; i < n; i++, p += 3) for (let c = 0; c < 3; c++) input[c * n + i] = small[p + c] / max - 0.5
  const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) })
  const map = out[sess.outputNames[0]].data
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < n; i++) {
    if (map[i] < lo) lo = map[i]
    if (map[i] > hi) hi = map[i]
  }
  const span = hi - lo || 1
  const grey = Buffer.alloc(n)
  for (let i = 0; i < n; i++) {
    let v = (map[i] - lo) / span
    // Optional hard edge: a smooth step around the threshold instead of the soft map.
    if (threshold) {
      const k = Math.min(1, Math.max(0, (v - threshold) / 0.1 + 0.5))
      v = k * k * (3 - 2 * k)
    }
    grey[i] = Math.round(v * 255)
  }
  return sharp(grey, { raw: { width: SIZE, height: SIZE, channels: 1 } }).resize(W, H, { fit: 'fill', kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer()
}

/**
 * @param {Buffer} bytes
 * @param {{ output?: 'cutout'|'mask', format?: 'png'|'webp'|'jpg', background?: string, quality?: number,
 *           crop?: boolean, padding?: number, hardEdges?: boolean, maxWidth?: number }} o
 */
export async function removeBackground(bytes, o = {}) {
  const base = sharp(bytes, { failOn: 'none', limitInputPixels: MAX_PIXELS }).rotate()
  let pipeline = base
  if (o.maxWidth) pipeline = pipeline.resize({ width: o.maxWidth, withoutEnlargement: true })
  const { data: rgb, info } = await pipeline.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const mask = await subjectMask(rgb, W, H, { threshold: o.hardEdges ? 0.5 : 0 })

  const quality = o.quality ?? 90
  let fmt = FORMATS[o.format] ?? FORMATS.png
  let img
  if (o.output === 'mask') {
    fmt = o.format === 'jpg' ? FORMATS.jpg : FORMATS.png
    img = sharp(mask, { raw: { width: W, height: H, channels: 1 } })
  } else {
    img = sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).joinChannel(mask, { raw: { width: W, height: H, channels: 1 } })
    const bg = o.background && o.background !== 'transparent' ? o.background : null
    if (bg || !fmt.alpha) img = sharp(await img.png().toBuffer()).flatten({ background: bg ?? '#ffffff' })
  }

  // Crop to the subject (alpha > ~4%) plus padding.
  let box = null
  if (o.crop) {
    let x0 = W
    let y0 = H
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (mask[y * W + x] > 10) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
    if (x1 >= 0) {
      const pad = Math.max(0, o.padding ?? 0)
      const left = Math.max(0, x0 - pad)
      const top = Math.max(0, y0 - pad)
      box = { left, top, width: Math.min(W, x1 + pad + 1) - left, height: Math.min(H, y1 + pad + 1) - top }
      img = sharp(await img.png().toBuffer()).extract(box)
    }
  }

  const output = await fmt.apply(img, quality).toBuffer()
  let covered = 0
  for (const v of mask) if (v > 127) covered++
  return {
    output,
    ext: fmt.ext,
    mime: fmt.mime,
    width: box?.width ?? W,
    height: box?.height ?? H,
    subjectPercent: Math.round((covered / (W * H)) * 1000) / 10,
  }
}
