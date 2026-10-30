// The headless API. The source lives with the site (src/tools/merge-audio/merge.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { probeMedia, mergeAudio } from '@chalidade/merge-audio'
//   const items = await Promise.all(files.map(async (file, i) => ({ id: String(i), file, info: await probeMedia(file) })))
//   const { blob, duration } = await mergeAudio(items, { out: 'mp3', gap: 0.5 }, onProgress, onStart)

export { mergeAudio, type AudioItem } from '@/tools/merge-audio/merge'
export type { AudioOut } from '@/lib/media'
export { probeMedia, hasWebCodecs, isCanceled, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
