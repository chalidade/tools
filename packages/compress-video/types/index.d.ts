// Public types of @chalidade/compress-video. They mirror src/tools/compress-video/compress.ts
// and src/lib/media.ts; types/check.ts fails the build if they drift.

/** How hard to compress: bits per pixel per frame of 0.1, 0.06 or 0.035. */
export type Level = 'light' | 'medium' | 'strong'
/** Target short side in pixels; 0 keeps the original size. Never scales up. */
export type Resolution = 0 | 1080 | 720 | 480

/** Output size for a target short side, keeping the aspect ratio and even dimensions. */
export declare function targetSize(width: number, height: number, resolution: Resolution): { width: number; height: number }
/** The video bitrate compressVideo will ask for, in bits per second (never above 85% of the source's). */
export declare function targetBitrate(info: MediaInfo, level: Level, resolution: Resolution): number

/**
 * Re-encodes a video to MP4 (H.264 when the browser can, else HEVC/VP9/AV1).
 * `info` comes from probeMedia and must have a video track. `onProgress`
 * gets 0–1; `onStart` receives a function that cancels the job.
 */
export declare function compressVideo(
  file: File,
  info: MediaInfo,
  opts: { level: Level; resolution: Resolution; keepAudio: boolean },
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
): Promise<Blob>

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
