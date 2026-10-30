// Public types of @chalidade/trim-media. They mirror src/tools/trim-media/trim.ts
// and src/lib/media.ts; types/check.ts fails the build if they drift.

export interface TrimOptions {
  /** 0–1. */
  onProgress?: (progress: number) => void
  /** Receives a function that cancels the job. */
  onStart?: (cancel: () => void) => void
}

export interface TrimResult {
  blob: Blob
  /** File extension of the result, e.g. "mp4", "mp3". */
  ext: string
  mimeType: string
}

/**
 * Keeps `range` (seconds) of a video or audio file, in the same container as
 * the input (MP4, MOV, WebM, MKV, MP3, WAV, OGG, AAC, FLAC; others become
 * MP4/M4A). Packets inside the range are copied, not re-encoded.
 */
export declare function trimMedia(file: File, range: { start: number; end: number }, opts?: TrimOptions): Promise<TrimResult>

// ---------------------------------------------------------------- shared media helpers

/** What probeMedia found in a file. */
export interface MediaInfo {
  /** Seconds. */
  duration: number
  video?: { width: number; height: number; codec: string | null; fps: number; bitrate: number }
  audio?: { codec: string | null; channels: number; sampleRate: number; bitrate: number }
}

/** Reads a file's duration and its first video/audio track. Rejects with UnsupportedMediaError for files it cannot read. */
export declare function probeMedia(file: File): Promise<MediaInfo>
/** True when the browser has WebCodecs (VideoEncoder and AudioEncoder), which every conversion needs. */
export declare const hasWebCodecs: () => boolean
/** True when an error came from cancelling a job. */
export declare const isCanceled: (e: unknown) => boolean
/** The browser cannot encode the requested codec. */
export declare class NoEncoderError extends Error {}
/** The file is not a format (or codec) that can be read. */
export declare class UnsupportedMediaError extends Error {}
