// Public types of @chalidade/compress-audio. They mirror src/tools/compress-audio/compress.ts
// and src/lib/media.ts; types/check.ts fails the build if they drift.

/** mp3 → .mp3, m4a → AAC in .m4a, opus → Opus in .ogg. */
export type AudioFormat = 'mp3' | 'm4a' | 'opus'

/** The formats this browser can produce. MP3 and AAC always work (a wasm encoder fills in); Opus needs a native encoder. */
export declare function availableFormats(): Promise<AudioFormat[]>
/**
 * Re-encodes the audio of an audio or video file (the video is dropped).
 * `bitrate` in bits per second, e.g. 96_000; `mono` mixes down to one channel.
 */
export declare function compressAudio(
  file: File,
  opts: { format: AudioFormat; bitrate: number; mono: boolean },
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
