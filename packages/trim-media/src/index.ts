// The headless API. The source lives with the site (src/tools/trim-media/trim.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { trimMedia } from '@chalidade/trim-media'
//   const { blob, ext } = await trimMedia(file, { start: 12.5, end: 30 })   // same format as the input

export { trimMedia, type TrimOptions, type TrimResult } from '@/tools/trim-media/trim'
export { probeMedia, hasWebCodecs, isCanceled, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
