import type JSZip from 'jszip'

export interface ZipEntry {
  path: string
  dir: boolean
  size: number
  date: Date
}

/** Strips drive letters, leading slashes and ".." so an entry can never point outside its folder. */
export function safePath(p: string) {
  return p
    .replace(/\\/g, '/')
    .split('/')
    .filter((s) => s && s !== '.' && s !== '..')
    .join('/')
}

/** A File's path inside a dropped folder (webkitRelativePath), else its name. */
export const filePath = (f: File) => safePath(f.webkitRelativePath || f.name)

/** Adds files under their paths; a repeated path gets " (2)" before the extension. */
export function uniquePaths(paths: string[]) {
  const seen = new Set<string>()
  return paths.map((p) => {
    let out = p
    for (let n = 2; seen.has(out.toLowerCase()); n++) out = p.replace(/(\.[^./]+)?$/, ` (${n})$1`)
    seen.add(out.toLowerCase())
    return out
  })
}

export async function createZip(files: File[], level: 'store' | 'normal' | 'max', onProgress?: (pct: number) => void) {
  const { default: JSZipCtor } = await import('jszip')
  const zip = new JSZipCtor()
  const names = uniquePaths(files.map(filePath))
  files.forEach((f, i) => zip.file(names[i], f, { date: new Date(f.lastModified) }))
  return zip.generateAsync(
    {
      type: 'blob',
      compression: level === 'store' ? 'STORE' : 'DEFLATE',
      compressionOptions: { level: level === 'max' ? 9 : 6 },
    },
    (m) => onProgress?.(m.percent),
  )
}

export async function readZip(file: File): Promise<{ zip: JSZip; entries: ZipEntry[] }> {
  const { default: JSZipCtor } = await import('jszip')
  const zip = await JSZipCtor.loadAsync(file)
  const entries: ZipEntry[] = []
  zip.forEach((path, e) => {
    // `_data.uncompressedSize` is jszip's own record of the size; absent for folders.
    const size = (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
    entries.push({ path: safePath(path), dir: e.dir, size, date: e.date })
  })
  return { zip, entries: entries.filter((e) => e.path).sort((a, b) => a.path.localeCompare(b.path)) }
}
