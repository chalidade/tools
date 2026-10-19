// HEIC/HEIF (iPhone photos) decoding with libheif compiled to wasm. The wasm
// is inlined in the bundle and served from this site; the module is imported
// only when a HEIC file is actually opened.

interface HeifImage {
  get_width: () => number
  get_height: () => number
  display: (target: { data: Uint8ClampedArray; width: number; height: number }, done: (out: unknown) => void) => void
}
interface Libheif {
  HeifDecoder: new () => { decode: (buffer: ArrayBuffer | Uint8Array) => HeifImage[] }
}

let lib: Promise<Libheif> | undefined

export function isHeic(file: File) {
  return /^image\/hei[cf]/.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

/** Decodes the first image of a HEIC file into canvas-ready pixels. */
export async function decodeHeic(file: File): Promise<ImageData> {
  lib ??= import('libheif-js/libheif-wasm/libheif-bundle.mjs').then((m) => (m.default as () => Libheif)())
  const { HeifDecoder } = await lib
  const [image] = new HeifDecoder().decode(await file.arrayBuffer())
  if (!image) throw new Error('heic')
  const width = image.get_width()
  const height = image.get_height()
  const data = new Uint8ClampedArray(width * height * 4)
  await new Promise<void>((resolve, reject) =>
    image.display({ data, width, height }, (out) => (out ? resolve() : reject(new Error('heic')))),
  )
  return new ImageData(data, width, height)
}
