// Public types of @chalidade/merge-audio. They mirror src/tools/merge-audio/merge.ts
// and src/lib/media.ts; types/check.ts fails the build if they drift.

export type AudioOut = 'mp3' | 'm4a' | 'wav'

export interface AudioItem {
  id: string
  file: File
  /** From probeMedia; must have an audio track. */
  info: MediaInfo
}

/**
 * Joins the files end to end, in order, with `gap` seconds of silence in
 * between. The result uses the highest sample rate (up to 48 kHz) and channel
 * count (up to stereo) of the inputs.
 */
export declare function mergeAudio(
  items: AudioItem[],
  opts: { out: AudioOut; gap: number },
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
): Promise<{ blob: Blob; duration: number }>

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
