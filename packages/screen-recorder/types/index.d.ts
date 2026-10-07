// Public types of @chalidade/screen-recorder. They mirror
// src/tools/screen-recorder/screen.ts; `npm run build` type-checks the
// package source, and types/check.ts fails the build if these drift.

export interface CaptureOptions {
  /** Ask for the tab's / system's sound (the visitor still ticks "share audio" in the picker). Default true. */
  systemAudio?: boolean
  /** Mix in the microphone. Default true. */
  microphone?: boolean
  /** 30 or 60. Default 30. */
  fps?: number
  /** Default 5 Mbps at 30 fps, 8 Mbps at 60. */
  videoBitsPerSecond?: number
}

export interface RecordingResult {
  blob: Blob
  mimeType: string
  /** Seconds of actual recording, pauses excluded. */
  duration: number
  width: number
  height: number
}

/** Something that didn't make it into the recording. */
export type CaptureWarning = 'system-audio-missing' | 'microphone-unavailable'

export interface Capture {
  /** The shared screen, for a live preview (`video.srcObject = capture.stream`). */
  readonly stream: MediaStream
  readonly width: number
  readonly height: number
  readonly warnings: CaptureWarning[]
  readonly state: 'ready' | 'recording' | 'paused' | 'stopped'
  /** Seconds recorded so far, pauses excluded. */
  elapsed(): number
  /** Begin recording (captureScreen() only prepares, so a UI can count down first). */
  start(): void
  pause(): void
  resume(): void
  /** Finish and get the file (null if nothing was recorded). Releases the screen and microphone. */
  stop(): Promise<RecordingResult | null>
  /** Throw the take away and release everything. */
  cancel(): void
  /** Called when the visitor ends sharing from the browser's own "Stop sharing" bar. */
  onended: (() => void) | null
}

/** False on phones and tablets, and in browsers without screen capture. */
export function canRecordScreen(): boolean

/** Opens the screen picker and prepares the recording. Call it from a click. */
export function captureScreen(options?: CaptureOptions): Promise<Capture>

/** captureScreen() + start(), in one call. Call it from a click. */
export function recordScreen(options?: CaptureOptions): Promise<Capture>

/** Re-encodes a recording to MP4 (H.264 + AAC where available). */
export function toMp4(
  recording: Blob,
  onProgress?: (progress: number) => void,
  onStart?: (cancel: () => void) => void,
): Promise<Blob>

/** The container/codec MediaRecorder will use in this browser ("video/webm;codecs=vp9,opus", …). */
export function pickVideoMimeType(): string
