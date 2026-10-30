// The headless API. The source lives with the site (src/tools/compress-audio/compress.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { compressAudio } from '@chalidade/compress-audio'
//   const mp3 = await compressAudio(file, { format: 'mp3', bitrate: 96_000, mono: false }, onProgress, onStart)

export { compressAudio, availableFormats, type AudioFormat } from '@/tools/compress-audio/compress'
export { probeMedia, hasWebCodecs, isCanceled, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
