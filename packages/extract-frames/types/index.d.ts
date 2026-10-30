// Public types of @chalidade/extract-frames. They mirror src/tools/extract-frames/frames.ts
// and src/lib/media.ts; types/check.ts fails the build if they drift.

export type FrameFormat = 'png' | 'jpeg' | 'webp'
/** File extension per format. */
export declare const FRAME_EXT: Record<FrameFormat, string>

export interface Frame {
  id: string
  /** Seconds. */
  time: number
  format: FrameFormat
  blob: Blob
  /** An object URL of `blob`; revoke it when done. */
  url: string
}

/** Times every `value` seconds from 0 ('every'), or `value` times spread evenly ('count'). */
export declare function plannedTimes(duration: number, mode: 'every' | 'count', value: number): number[]
/**
 * Decodes the exact frame at each time (full resolution, rotation applied)
 * and encodes it as an image. Return true from `isCanceled` to stop.
 */
export declare function captureFrames(
  file: File,
  times: number[],
  format: FrameFormat,
  onFrame: (frame: Frame) => void,
  onProgress: (done: number, total: number) => void,
  isCanceled: () => boolean,
): Promise<void>
/** "video-0m12.50s.png" — sortable and readable. */
export declare function frameName(base: string, frame: Frame): string
/** All frames in one ZIP (stored, not compressed: the images already are). */
export declare function zipFrames(frames: Frame[], base: string): Promise<Blob>

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
