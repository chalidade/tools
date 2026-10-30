// Public types of @chalidade/gif-mp4. They mirror src/tools/gif-mp4/gif.ts
// and src/lib/media.ts; types/check.ts fails the build if they drift.

export interface GifInfo {
  width: number
  height: number
  frames: number
  /** Seconds, one loop. */
  duration: number
}

/** By MIME type or .gif extension. */
export declare const isGif: (file: File) => boolean
/** Size, frame count and loop length of a GIF. */
export declare function readGifInfo(file: File): Promise<GifInfo>
/**
 * GIF → MP4 (H.264 when the browser can). Transparent pixels go on
 * `background` (any CSS colour); `loops` repeats the animation.
 */
export declare function gifToMp4(file: File, opts: { background: string; loops: number }, onProgress: (p: number) => void): Promise<Blob>
/**
 * Video → GIF: `fps` frames a second between `start` and `end` (seconds),
 * `width` px wide, each frame with its own 256-colour palette. Return true
 * from `isCanceled` to stop.
 */
export declare function videoToGif(
  file: File,
  opts: { start: number; end: number; fps: number; width: number },
  onProgress: (p: number) => void,
  isCanceled: () => boolean,
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
