// IndexedDB storage for the vault: only ciphertext and the public salt live here.
import type { Meta, Record } from './vault'

const DB = 'toowl-brankas'

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('meta')
      r.result.createObjectStore('files', { keyPath: 'id' })
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

async function run<T>(stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => IDBRequest | void): Promise<T> {
  const db = await open()
  return new Promise<T>((res, rej) => {
    const tx = db.transaction(stores, mode)
    const req = fn(tx)
    tx.oncomplete = () => {
      db.close()
      res((req ? req.result : undefined) as T)
    }
    tx.onerror = tx.onabort = () => {
      db.close()
      rej(tx.error)
    }
  })
}

export const getMeta = () => run<Meta | undefined>(['meta'], 'readonly', (tx) => tx.objectStore('meta').get('meta'))
export const getRecords = () => run<Record[]>(['files'], 'readonly', (tx) => tx.objectStore('files').getAll())
export const putRecord = (r: Record) => run<void>(['files'], 'readwrite', (tx) => tx.objectStore('files').put(r))
export const deleteRecord = (id: string) => run<void>(['files'], 'readwrite', (tx) => tx.objectStore('files').delete(id))

/** Replaces everything (new vault, or restore from a backup). */
export const replaceAll = (meta: Meta, records: Record[]) =>
  run<void>(['meta', 'files'], 'readwrite', (tx) => {
    tx.objectStore('meta').put(meta, 'meta')
    const f = tx.objectStore('files')
    f.clear()
    records.forEach((r) => f.put(r))
  })

export const wipe = () =>
  run<void>(['meta', 'files'], 'readwrite', (tx) => {
    tx.objectStore('meta').clear()
    tx.objectStore('files').clear()
  })
