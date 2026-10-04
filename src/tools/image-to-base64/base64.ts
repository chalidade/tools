// Image ⇄ Base64 in the visitor's browser. Encoding reads the file's bytes
// as they are (no re-encoding, so nothing changes); decoding checks the
// bytes really are an image before showing them.

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Browsers sometimes report no type (e.g. .ico, .avif on older systems); guess it from the bytes. */
export function withMime(dataUrl: string, bytes: Uint8Array) {
  if (!dataUrl.startsWith('data:;') && !dataUrl.startsWith('data:application/octet-stream;')) return dataUrl
  const mime = sniffMime(bytes) ?? 'application/octet-stream'
  return `data:${mime};base64,` + dataUrl.slice(dataUrl.indexOf(',') + 1)
}

export type SnippetKind = 'data-url' | 'base64' | 'html' | 'css' | 'markdown'

export function snippet(kind: SnippetKind, dataUrl: string, name: string) {
  const alt = name.replace(/\.[^.]+$/, '').replace(/"/g, '')
  switch (kind) {
    case 'data-url':
      return dataUrl
    case 'base64':
      return dataUrl.slice(dataUrl.indexOf(',') + 1)
    case 'html':
      return `<img src="${dataUrl}" alt="${alt}">`
    case 'css':
      return `background-image: url("${dataUrl}");`
    case 'markdown':
      return `![${alt}](${dataUrl})`
  }
}

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/svg+xml': 'svg',
}

const starts = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v)
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

/** The image type from its first bytes, or null when it is not a known image. */
export function sniffMime(b: Uint8Array): string | null {
  if (starts(b, [0x89, 0x50, 0x4e, 0x47])) return 'image/png'
  if (starts(b, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (starts(b, ascii('GIF8'))) return 'image/gif'
  if (starts(b, ascii('RIFF')) && starts(b, ascii('WEBP'), 8)) return 'image/webp'
  if (starts(b, ascii('ftyp'), 4) && (starts(b, ascii('avif'), 8) || starts(b, ascii('avis'), 8))) return 'image/avif'
  if (starts(b, ascii('BM'))) return 'image/bmp'
  if (starts(b, [0, 0, 1, 0])) return 'image/x-icon'
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart().toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml'
  return null
}

export class NotBase64Error extends Error {}
export class NotImageError extends Error {}

/**
 * Accepts a data URL or bare Base64 (standard or URL-safe, with or without
 * line breaks or padding, even wrapped in quotes or url(...)) and returns the
 * decoded image.
 */
export function decodeBase64Image(input: string): { blob: Blob; mime: string; ext: string; size: number } {
  let text = input.trim()
  // Pasted straight from CSS/HTML/JSON: unwrap url("…"), src="…", quotes.
  const inData = /data:[^"')\s]*/.exec(text)
  if (inData) text = text.slice(inData.index).replace(/["')\s;]+$/, '')
  text = text.replace(/^["']|["']$/g, '')

  let declared: string | null = null
  const m = /^data:([^;,]*)(?:;[^,]*)?,/.exec(text)
  if (m) {
    if (!/;base64,/i.test(text.slice(0, m[0].length))) throw new NotBase64Error()
    declared = m[1] || null
    text = text.slice(m[0].length)
  }
  let b64 = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!b64 || /[^A-Za-z0-9+/=]/.test(b64)) throw new NotBase64Error()
  b64 = b64.replace(/=+$/, '')
  if (b64.length % 4 === 1) throw new NotBase64Error()
  b64 += '='.repeat((4 - (b64.length % 4)) % 4)

  let binary: string
  try {
    binary = atob(b64)
  } catch {
    throw new NotBase64Error()
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const mime = sniffMime(bytes) ?? (declared?.startsWith('image/') ? declared : null)
  if (!mime) throw new NotImageError()
  return { blob: new Blob([bytes], { type: mime }), mime, ext: MIME_EXT[mime] ?? 'img', size: bytes.length }
}
