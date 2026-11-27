// AI upscaling with Real-ESRGAN's compact general model (realesr-general-x4v3,
// BSD-3-Clause), the same ONNX file and tiling as toowl.my.id/tools/upscale-image/,
// run here with ONNX Runtime on the CPU. The model ships in this folder.

import os from 'node:os'
import { fileURLToPath } from 'node:url'
import * as ort from 'onnxruntime-node'
import sharp from 'sharp'

const MODEL = fileURLToPath(new URL('../realesr-general-x4v3.onnx', import.meta.url))
const MODEL_SCALE = 4
/** Pixels of context around each tile, so tile seams do not show. */
const PAD = 12
const TILE = 192

/** Largest input per scale (pixels): keeps memory and run time reasonable. */
export const MAX_INPUT_PIXELS = { 2: 4_000_000, 4: 2_000_000 }

let session = null
function loadSession() {
  session ??= ort.InferenceSession.create(MODEL, {
    graphOptimizationLevel: 'all',
    intraOpNumThreads: Math.max(1, os.availableParallelism?.() ?? os.cpus().length),
  })
  return session
}

const FORMATS = {
  png: { ext: 'png', mime: 'image/png', apply: (s) => s.png({ compressionLevel: 9, adaptiveFiltering: true }) },
  jpg: { ext: 'jpg', mime: 'image/jpeg', apply: (s, q) => s.jpeg({ quality: q, mozjpeg: true }) },
  webp: { ext: 'webp', mime: 'image/webp', apply: (s, q) => s.webp({ quality: q, effort: 4 }) },
}

/**
 * @param {Buffer} bytes
 * @param {{ scale?: 2|4, format?: 'png'|'jpg'|'webp', quality?: number, maxInputPixels?: number }} o
 */
export async function upscaleImage(bytes, o = {}) {
  const scale = o.scale === 2 ? 2 : 4
  const fmt = FORMATS[o.format] ?? FORMATS.png
  const quality = Math.max(1, Math.min(100, o.quality ?? 92))

  const base = sharp(bytes, { failOn: 'none', limitInputPixels: 268_402_689 }).rotate()
  const meta = await sharp(bytes, { failOn: 'none' }).metadata()
  const inputFormat = meta.format ?? 'unknown'
  if (inputFormat === 'heif' && meta.compression !== 'av1') {
    throw new Error('HEIC/HEIF photos are not supported here: convert them to JPG first (e.g. with the Image Converter Actor).')
  }
  const { data, info } = await base.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const limit = o.maxInputPixels ?? MAX_INPUT_PIXELS[scale]
  if (w * h > limit) {
    const side = Math.floor(Math.sqrt(limit))
    throw new Error(`Image is ${w}×${h} (${(w * h / 1e6).toFixed(1)} MP); the limit for ${scale}× is ${(limit / 1e6).toFixed(1)} MP (about ${side}×${side}). Downscale it first or use 2×.`)
  }

  let hasAlpha = false
  for (let i = 3; i < data.length; i += 4)
    if (data[i] < 255) {
      hasAlpha = true
      break
    }

  const s = await loadSession()
  const W = w * MODEL_SCALE
  const H = h * MODEL_SCALE
  const out = Buffer.alloc(W * H * 3)
  for (let y0 = 0; y0 < h; y0 += TILE) {
    for (let x0 = 0; x0 < w; x0 += TILE) {
      const x1 = Math.min(w, x0 + TILE)
      const y1 = Math.min(h, y0 + TILE)
      const px0 = Math.max(0, x0 - PAD)
      const py0 = Math.max(0, y0 - PAD)
      const px1 = Math.min(w, x1 + PAD)
      const py1 = Math.min(h, y1 + PAD)
      const tw = px1 - px0
      const th = py1 - py0
      const plane = tw * th
      const input = new Float32Array(3 * plane)
      for (let y = 0; y < th; y++)
        for (let x = 0; x < tw; x++) {
          const src = ((py0 + y) * w + (px0 + x)) * 4
          const d = y * tw + x
          input[d] = data[src] / 255
          input[plane + d] = data[src + 1] / 255
          input[2 * plane + d] = data[src + 2] / 255
        }
      const res = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, th, tw]) })
      const t = res[s.outputNames[0]]
      const od = t.data
      const ow = tw * MODEL_SCALE
      const oplane = ow * th * MODEL_SCALE
      const cx = (x0 - px0) * MODEL_SCALE
      const cy = (y0 - py0) * MODEL_SCALE
      const cw = (x1 - x0) * MODEL_SCALE
      const ch = (y1 - y0) * MODEL_SCALE
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          const si = (cy + y) * ow + (cx + x)
          const di = ((y0 * MODEL_SCALE + y) * W + (x0 * MODEL_SCALE + x)) * 3
          out[di] = clamp(od[si])
          out[di + 1] = clamp(od[oplane + si])
          out[di + 2] = clamp(od[2 * oplane + si])
        }
      t.dispose?.()
    }
  }

  let img = sharp(out, { raw: { width: W, height: H, channels: 3 }, limitInputPixels: false })
  if (hasAlpha) {
    // Carry transparency over by scaling the alpha channel smoothly.
    const alpha = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .extractChannel(3)
      .resize(W, H, { kernel: 'lanczos3' })
      .raw()
      .toBuffer()
    img = sharp(out, { raw: { width: W, height: H, channels: 3 }, limitInputPixels: false }).joinChannel(alpha, {
      raw: { width: W, height: H, channels: 1 },
    })
  }
  if (scale !== MODEL_SCALE) {
    // 2×: the 4× output reduced with a sharp kernel beats a 2×-trained small model.
    const buf = await img.raw().toBuffer({ resolveWithObject: true })
    img = sharp(buf.data, { raw: buf.info, limitInputPixels: false }).resize(w * scale, h * scale, { kernel: 'lanczos3' })
  }
  if (hasAlpha && fmt.ext === 'jpg') img = img.flatten({ background: '#ffffff' })
  const output = await fmt.apply(img, quality).toBuffer()
  return { output, ext: fmt.ext, mime: fmt.mime, inputFormat, widthBefore: w, heightBefore: h, width: w * scale, height: h * scale, hasAlpha }
}

const clamp = (v) => (v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255))
