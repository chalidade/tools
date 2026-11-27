import { loadLogo, processPhoto, type ProcessOpts } from './process'

export interface Job {
  id: number
  file: Blob
  opts: ProcessOpts
  logo: Blob | null
  /** Changes whenever the logo does, so the worker decodes it once. */
  logoId: number
}

let logoKey = -1
let logoCache: Awaited<ReturnType<typeof loadLogo>> | null = null

self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, file, opts, logo, logoId } = e.data
  try {
    if (logoId !== logoKey) {
      logoCache?.close()
      logoCache = logo ? await loadLogo(logo) : null
      logoKey = logoId
    }
    const blob = await processPhoto(file, opts, logoCache)
    self.postMessage({ id, blob })
  } catch {
    self.postMessage({ id, error: true })
  }
}
