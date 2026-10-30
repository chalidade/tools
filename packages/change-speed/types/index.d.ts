// Public types of @chalidade/change-speed. They mirror src/tools/change-speed/
// and src/lib/media.ts; types/check.ts fails the build if they drift.

export interface SpeedOptions {
  /** 0.25–4; above 1 is faster. */
  speed: number
  /** Time-stretch the audio (WSOLA) instead of resampling it, so voices don't turn chipmunk. */
  keepPitch: boolean
  /** For videos: keep the sound track. */
  keepAudio: boolean
  /** Output for audio-only files. */
  audioOut: 'mp3' | 'm4a' | 'wav'
}

/** Extension and MIME type of the result: MP4 for videos, `audioOut` for audio. */
export declare function outputFor(info: MediaInfo, opts: SpeedOptions): { ext: string; mimeType: string }
/** Re-times a video or audio file. `info` comes from probeMedia. */
export declare function changeSpeed(
  file: File,
  info: MediaInfo,
  opts: SpeedOptions,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
): Promise<Blob>

/** Changes the speed of planar float32 audio, chunk by chunk. */
export interface SpeedProcessor {
  push(planes: Float32Array[]): Float32Array[]
  /** Whatever is still buffered, once the input has ended. */
  flush(): Float32Array[]
}
/** Time-stretch that keeps the pitch (WSOLA). */
export declare class TimeStretch implements SpeedProcessor {
  constructor(channels: number, sampleRate: number, speed: number)
  push(planes: Float32Array[]): Float32Array[]
  flush(): Float32Array[]
}
/** Plain resample: faster is higher, slower is lower. */
export declare class Resample implements SpeedProcessor {
  constructor(channels: number, speed: number)
  push(planes: Float32Array[]): Float32Array<ArrayBuffer>[]
  flush(): Float32Array<ArrayBuffer>[]
}

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
