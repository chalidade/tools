// Public types of @chalidade/audio-recorder. They mirror src/tools/audio-recorder/recorder.ts;
// types/check.ts fails the build if they drift.

export type AudioOut = 'mp3' | 'm4a' | 'wav'

/** One finished recording, as the element's `recording` event delivers it. */
export interface Recording {
  id: string
  name: string
  createdAt: number
  /** Seconds, measured while recording (WebM from MediaRecorder carries none). */
  duration: number
  mimeType: string
  blob: Blob
}

/** True when the browser can record the microphone (getUserMedia + MediaRecorder). */
export declare const canRecord: () => boolean
/** The best type MediaRecorder can record into here: Opus in WebM (Chrome, Firefox), AAC in MP4 (Safari); null without MediaRecorder. */
export declare function pickMimeType(): string | null
/** "webm", "m4a" or "ogg" for a recorded MIME type. */
export declare function extensionOf(mimeType: string): 'm4a' | 'ogg' | 'webm'
/** Re-encodes a recording to MP3, M4A (AAC) or WAV (wasm encoders fill in where the browser has none). */
export declare function convertRecording(
  r: Recording,
  out: AudioOut,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
): Promise<Blob>
