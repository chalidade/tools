// Camera RAW (Sony ARW and the other formats LibRaw knows) → pixels, in the
// browser. Decoding uses LibRaw compiled to wasm by `libraw-wasm` (ISC
// wrapper; LibRaw is LGPL-2.1/CDDL). Its glue finds worker.js and the wasm
// through `new URL(…, import.meta.url)`, so Vite bundles both and nothing is
// fetched from elsewhere. Each file gets a fresh instance (its own worker),
// disposed afterwards, so a 60 MP file does not leave hundreds of MB behind.
//
// The build uses wasm threads, i.e. shared memory. Browsers that only allow
// that on cross-origin-isolated pages (this site is not one) get the JPG
// preview every RAW file carries instead, read straight from the TIFF
// structure here — smaller, but the camera's own rendering.

export interface RawSettings {
  /** Half the width and height: about 4× faster, still 6 MP from a 24 MP camera. */
  half: boolean
}

export type RawDecoded =
  | { kind: 'pixels'; image: ImageData; camera?: string }
  | { kind: 'preview'; blob: Blob; camera?: string }

export class NotRawError extends Error {}

export const RAW_EXTENSIONS = ['arw', 'srf', 'sr2', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'raf', 'orf', 'rw2', 'pef', 'dng', 'srw', '3fr', 'iiq', 'rwl', 'raw', 'x3f', 'mrw', 'erf', 'kdc', 'dcr']

export const isRaw = (file: File) => RAW_EXTENSIONS.includes(file.name.split('.').pop()?.toLowerCase() ?? '')

let threads: boolean | undefined
/** Can this page create shared wasm memory? */
export function canDecodeFully() {
  if (threads !== undefined) return threads
  try {
    new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true })
    threads = true
  } catch {
    threads = false
  }
  return threads
}

export async function decodeRaw(file: File, settings: RawSettings): Promise<RawDecoded> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (canDecodeFully()) {
    try {
      return await decodeWithLibRaw(bytes.slice(), settings)
    } catch {
      // fall through to the embedded preview
    }
  }
  const preview = embeddedJpeg(bytes)
  if (!preview) throw new NotRawError()
  return { kind: 'preview', blob: preview }
}

async function decodeWithLibRaw(bytes: Uint8Array<ArrayBuffer>, { half }: RawSettings): Promise<RawDecoded> {
  const { default: LibRaw } = await import('libraw-wasm')
  const raw = new LibRaw()
  try {
    await raw.open(bytes, {
      useCameraWb: true, // the white balance set on the camera
      outputColor: 1, // sRGB
      outputBps: 8,
      userQual: 3, // AHD demosaic
      halfSize: half,
      highlight: 0,
    })
    const meta = await raw.metadata().catch(() => undefined)
    const out = await raw.imageData()
    if (!out || out.colors !== 3 || out.bits !== 8) throw new Error('raw')
    const { width, height } = out
    const rgb = out.data as Uint8Array
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
      rgba[j] = rgb[i]
      rgba[j + 1] = rgb[i + 1]
      rgba[j + 2] = rgb[i + 2]
      rgba[j + 3] = 255
    }
    const m = meta as { make?: string; model?: string; camera_make?: string; camera_model?: string } | undefined
    const camera = [m?.make ?? m?.camera_make, m?.model ?? m?.camera_model].filter(Boolean).join(' ').trim() || undefined
    return { kind: 'pixels', image: new ImageData(rgba, width, height), camera }
  } finally {
    raw.dispose()
  }
}

/**
 * The largest JPEG stored inside a TIFF-based RAW (ARW, CR2, NEF, DNG, …):
 * walks IFD0, its chain and SubIFDs/EXIF, looking at JPEGInterchangeFormat
 * and single-strip JPEG images.
 */
export function embeddedJpeg(bytes: Uint8Array): Blob | undefined {
  if (bytes.length < 16) return
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const order = view.getUint16(0)
  if (order !== 0x4949 && order !== 0x4d4d) return
  const le = order === 0x4949
  const u16 = (o: number) => view.getUint16(o, le)
  const u32 = (o: number) => view.getUint32(o, le)
  const candidates: [number, number][] = []
  const seen = new Set<number>()

  const readValues = (at: number): number[] => {
    const type = u16(at + 2)
    const count = u32(at + 4)
    const size = type === 3 ? 2 : 4
    if (type !== 3 && type !== 4 && type !== 13) return []
    const base = count * size <= 4 ? at + 8 : u32(at + 8)
    const vals: number[] = []
    for (let i = 0; i < Math.min(count, 64); i++) {
      const o = base + i * size
      if (o + size > bytes.length) break
      vals.push(size === 2 ? u16(o) : u32(o))
    }
    return vals
  }

  const walk = (offset: number, depth: number) => {
    while (offset > 0 && offset + 2 <= bytes.length && !seen.has(offset) && depth < 8) {
      seen.add(offset)
      const n = u16(offset)
      if (offset + 2 + n * 12 + 4 > bytes.length) return
      const tags = new Map<number, number[]>()
      for (let i = 0; i < n; i++) {
        const at = offset + 2 + i * 12
        const tag = u16(at)
        if ([259, 273, 279, 330, 513, 514, 34665].includes(tag)) tags.set(tag, readValues(at))
      }
      const jpegAt = tags.get(513)?.[0]
      const jpegLen = tags.get(514)?.[0]
      if (jpegAt && jpegLen) candidates.push([jpegAt, jpegLen])
      const strips = tags.get(273)
      const counts = tags.get(279)
      const compression = tags.get(259)?.[0]
      if (strips?.length === 1 && counts?.length === 1 && (compression === 6 || compression === 7)) candidates.push([strips[0], counts[0]])
      for (const sub of tags.get(330) ?? []) walk(sub, depth + 1)
      for (const exif of tags.get(34665) ?? []) walk(exif, depth + 1)
      offset = u32(offset + 2 + n * 12)
    }
  }
  walk(u32(4), 0)

  let best: [number, number] | undefined
  for (const [at, len] of candidates) {
    if (at + len > bytes.length || len < 1024) continue
    // A baseline JPEG, not the lossless-JPEG raw data itself.
    if (bytes[at] !== 0xff || bytes[at + 1] !== 0xd8) continue
    if (isLosslessJpeg(bytes, at, len)) continue
    if (!best || len > best[1]) best = [at, len]
  }
  return best && new Blob([bytes.slice(best[0], best[0] + best[1])], { type: 'image/jpeg' })
}

function isLosslessJpeg(bytes: Uint8Array, at: number, len: number) {
  let p = at + 2
  const end = Math.min(at + len, at + 65536)
  while (p + 4 < end) {
    if (bytes[p] !== 0xff) return false
    const marker = bytes[p + 1]
    if (marker === 0xc3) return true
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) return false
    p += 2 + ((bytes[p + 2] << 8) | bytes[p + 3])
  }
  return false
}
