import { locale } from '@/lib/i18n'

// A small IndexedDB store for things a tool keeps on this device between
// visits (recordings). One database per tool, one object store, keyed by id.
// Nothing here ever leaves the browser.

export interface Stored {
  id: string
  createdAt: number
}

const STORE = 'items'

export function localStore<T extends Stored>(dbName: string) {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

  async function run<R>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const db = await open()
    try {
      return await new Promise<R>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    } finally {
      db.close()
    }
  }

  return {
    /** Newest first. */
    list: async () => (await run<T[]>('readonly', (s) => s.getAll() as IDBRequest<T[]>)).sort((a, b) => b.createdAt - a.createdAt),
    save: async (item: T) => {
      await run('readwrite', (s) => s.put(item))
      // Ask the browser not to evict saved items when space runs low.
      void navigator.storage?.persist?.()
    },
    remove: (id: string) => run('readwrite', (s) => s.delete(id)),
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10)

/** "Rekaman 7 Okt 14.05" / "Recording Oct 7, 2:05 PM" — the date in the current language. */
export function timestampName(prefix: string, date = new Date()) {
  const day = date.toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
  const time = date.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
  return `${prefix} ${day} ${time}`
}

/** A file name without characters that file systems reject. */
export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'rekaman'

/**
 * MediaRecorder's WebM has no duration in its header, so a <video>/<audio>
 * shows "Infinity" and cannot seek. Seeking past the end once makes the
 * browser scan the file and learn it. Use as onLoadedMetadata.
 */
export function fixRecordedDuration(el: HTMLMediaElement) {
  if (el.duration !== Infinity) return
  el.currentTime = 1e101
  el.ontimeupdate = () => {
    el.ontimeupdate = null
    el.currentTime = 0
  }
}
