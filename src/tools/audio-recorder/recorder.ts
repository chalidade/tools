// Recording with the browser's own MediaRecorder, and a tiny IndexedDB store
// so recordings survive a reload. Nothing leaves the device.

import { AUDIO_OUTPUTS, convertMedia, ensureAudioEncoder, NoEncoderError, type AudioOut } from '@/lib/media'

export interface Recording {
  id: string
  name: string
  createdAt: number
  /** Seconds, measured while recording (WebM from MediaRecorder carries none). */
  duration: number
  mimeType: string
  blob: Blob
}

/** The best container this browser can record into: Opus in WebM (Chrome, Firefox), AAC in MP4 (Safari). */
export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export const canRecord = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

export function extensionOf(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

// ---------------------------------------------------------------- storage

const DB = 'tools-audio-recorder'
const STORE = 'recordings'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export async function listRecordings(): Promise<Recording[]> {
  const all = await run<Recording[]>('readonly', (s) => s.getAll() as IDBRequest<Recording[]>)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}
export const saveRecording = (r: Recording) => run('readwrite', (s) => s.put(r))
export const deleteRecording = (id: string) => run('readwrite', (s) => s.delete(id))

// ---------------------------------------------------------------- export

/** Re-encodes a recording to MP3, M4A (AAC) or WAV. */
export async function convertRecording(
  r: Recording,
  out: AudioOut,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const choice = AUDIO_OUTPUTS[out]
  if (choice.codec && !(await ensureAudioEncoder(choice.codec))) throw new NoEncoderError(out)
  return convertMedia({
    file: new File([r.blob], `${r.name}.${extensionOf(r.mimeType)}`, { type: r.mimeType }),
    format: choice.format,
    mimeType: choice.mimeType,
    audio: choice.codec ? { codec: choice.codec, bitrate: 160_000 } : { codec: 'pcm-s16' },
    onProgress,
    onStart,
  })
}

/** "Rekaman 7 Okt 14.05" */
export function defaultName(date = new Date()) {
  const day = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `Rekaman ${day} ${time}`
}

/** A file name without characters that file systems reject. */
export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'rekaman'
