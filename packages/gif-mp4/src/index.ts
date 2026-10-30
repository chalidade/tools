// The headless API. The source lives with the site (src/tools/gif-mp4/gif.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { gifToMp4, videoToGif } from '@chalidade/gif-mp4'
//   const mp4 = await gifToMp4(gif, { background: '#ffffff', loops: 1 }, onProgress)
//   const out = await videoToGif(video, { start: 0, end: 3, fps: 12, width: 480 }, onProgress, () => false)

export { isGif, readGifInfo, gifToMp4, videoToGif, type GifInfo } from '@/tools/gif-mp4/gif'
export { probeMedia, hasWebCodecs, isCanceled, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
