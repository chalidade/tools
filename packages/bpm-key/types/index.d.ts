// Public types of @chalidade/bpm-key. They mirror src/tools/bpm-key/analyze.ts;
// types/check.ts fails the build if they drift.

export interface Analysis {
  bpm: number
  /** 0–1, how clearly one tempo stood out. About 0.25 and up is a steady beat. */
  bpmConfidence: number
  /** Pitch class of the tonic (C = 0) and the mode. */
  key: { tonic: number; minor: boolean }
  /** 0–1, how far the winning key is ahead of the runner-up. */
  keyConfidence: number
  /** The best four keys, best first. */
  keys: { tonic: number; minor: boolean; score: number }[]
  /** Length of the analysed audio. */
  seconds: number
}

/** Sample rate `analyze` expects: 11025 Hz. */
export declare const RATE = 11025

/**
 * Tempo (spectral-flux onsets, autocorrelated, 50–220 BPM) and key
 * (chromagram against the Krumhansl–Kessler profiles) of mono samples at
 * RATE. Synchronous and CPU-bound: run it in a Worker for long audio.
 */
export declare function analyze(samples: Float32Array): Analysis
/** Decodes any audio the browser can play (or a video's soundtrack) to mono at RATE, at most 8 minutes. */
export declare function decodeToMono(file: File): Promise<Float32Array>
/** Camelot wheel code DJs mix by: 8A = A minor, 8B = C major. */
export declare function camelot(tonic: number, minor: boolean): string
