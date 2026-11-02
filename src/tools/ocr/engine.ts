// Tesseract (wasm) running from this site's own files. tesseract.js would by
// default fetch its worker, core and language data from jsdelivr; here all
// three are bundled by Vite (?url) and passed in, so nothing leaves the page.
// The whole module is a dynamic import from the tool, loaded only when used.

import type { Worker } from 'tesseract.js'
import workerUrl from 'tesseract.js/dist/worker.min.js?url'
import coreSimd from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'
import coreBase from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url'
import indUrl from '@tesseract.js-data/ind/4.0.0_best_int/ind.traineddata.gz?url'
import engUrl from '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url'

export type OcrLang = 'ind' | 'eng' | 'ind+eng'

const DATA: Record<'ind' | 'eng', string> = { ind: indUrl, eng: engUrl }

// A tiny module using a SIMD instruction: validates only where SIMD exists.
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])

async function langData(code: 'ind' | 'eng') {
  const res = await fetch(DATA[code])
  if (!res.ok) throw new Error('lang data')
  return { code, data: new Uint8Array(await res.arrayBuffer()) }
}

export interface OcrProgress {
  status: string
  progress: number
}

/** Starts a worker for the language(s). Call `terminate()` when done. */
export async function createOcr(lang: OcrLang, onProgress: (p: OcrProgress) => void): Promise<Worker> {
  const { createWorker } = await import('tesseract.js')
  const codes = lang === 'ind+eng' ? (['ind', 'eng'] as const) : ([lang] as const)
  const langs = await Promise.all(codes.map(langData))
  const abs = (u: string) => new URL(u, document.baseURI).href
  return createWorker(langs as unknown as string[], 1, {
    workerPath: abs(workerUrl),
    corePath: abs(WebAssembly.validate(SIMD_PROBE) ? coreSimd : coreBase),
    // Language data is handed over directly, so nothing is cached in IndexedDB.
    cacheMethod: 'none',
    logger: (m: { status: string; progress: number }) => onProgress({ status: m.status, progress: m.progress }),
  })
}
