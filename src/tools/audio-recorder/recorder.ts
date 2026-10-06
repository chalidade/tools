// Recording with the browser's own MediaRecorder, and a tiny IndexedDB store
// so recordings survive a reload. Nothing leaves the device.

import { AUDIO_OUTPUTS, convertMedia, ensureAudioEncoder, NoEncoderError, type AudioOut } from '@/lib/media'
import { localStore, timestampName } from '@/lib/local-store'

export { safeFileName } from '@/lib/local-store'

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

const store = localStore<Recording>('tools-audio-recorder')
export const listRecordings = store.list
export const saveRecording = store.save
export const deleteRecording = store.remove

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

export const defaultName = () => timestampName('Rekaman')
