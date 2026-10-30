// Cuts a part out of a video or audio file in the visitor's browser, in the
// file's own container. Mediabunny copies the packets between the cut
// points as they are; only the audio at the cut points is re-encoded, for
// an exact cut. Built on src/lib/media.ts; nothing is uploaded.

import { convertMedia, ensureAudioEncoder, probeMedia, sameContainer } from '@/lib/media'

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

/** Keeps `range` (seconds) of the file, in the same format as the input. */
export async function trimMedia(file: File, range: { start: number; end: number }, opts: TrimOptions = {}): Promise<TrimResult> {
  const [info, out] = await Promise.all([probeMedia(file), sameContainer(file)])
  const whole = range.start <= 0.001 && range.end >= info.duration - 0.001
  // Browsers have no MP3 encoder and often no AAC one, so load the wasm ones for those.
  const codec = info.audio?.codec
  if (!whole && (codec === 'mp3' || codec === 'aac')) await ensureAudioEncoder(codec)
  const blob = await convertMedia({
    file,
    format: out.format,
    mimeType: out.mimeType,
    trim: whole ? undefined : range,
    onProgress: opts.onProgress ?? (() => {}),
    onStart: opts.onStart,
  })
  return { blob, ext: out.ext, mimeType: out.mimeType }
}
