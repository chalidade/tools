// Converts pictures between formats in the browser: decode (HEIC via wasm,
// everything else with the browser), draw, encode. Nothing is uploaded.

import { canvasBlob, decodeImage, newCanvas } from '@/lib/image'
import { decodeHeic, isHeic } from './heic'

export type Target = 'image/jpeg' | 'image/png' | 'image/webp'

const EXT: Record<Target, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export function targetName(file: File, target: Target) {
  return file.name.replace(/\.[^.]+$/, '') + '.' + EXT[target]
}

export interface Converted {
  blob: Blob
  width: number
  height: number
}

/** PNG/WebP/AVIF/HEIC/… → the chosen format. JPG has no transparency, so it is flattened onto white. */
export async function convertImage(file: File, target: Target, quality: number): Promise<Converted> {
  const canvas = await draw(file)
  if (target === 'image/jpeg') {
    const flat = newCanvas(canvas.width, canvas.height)
    const ctx = flat.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, flat.width, flat.height)
    ctx.drawImage(canvas, 0, 0)
    return { blob: await canvasBlob(flat, target, quality), width: flat.width, height: flat.height }
  }
  const blob = await canvasBlob(canvas, target, target === 'image/png' ? undefined : quality)
  // Old Safari answers PNG when it cannot encode WebP.
  if (blob.type !== target) throw new Error('encode')
  return { blob, width: canvas.width, height: canvas.height }
}

async function draw(file: File) {
  if (isHeic(file)) {
    const pixels = await decodeHeic(file)
    const canvas = newCanvas(pixels.width, pixels.height)
    canvas.getContext('2d')!.putImageData(pixels, 0, 0)
    return canvas
  }
  const img = await decodeImage(file)
  try {
    const canvas = newCanvas(img.width, img.height)
    canvas.getContext('2d')!.drawImage(img.source, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    img.close()
  }
}
