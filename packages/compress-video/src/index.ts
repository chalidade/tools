// The headless API. The source lives with the site (src/tools/compress-video/),
// so the tool on toowl.my.id and this package are the same code.
//
//   import { probeMedia, compressVideo } from '@chalidade/compress-video'
//   const info = await probeMedia(file)
//   const mp4 = await compressVideo(file, info, { level: 'medium', resolution: 720, keepAudio: true }, onProgress, onStart)

export { compressVideo, targetSize, targetBitrate, type Level, type Resolution } from '@/tools/compress-video/compress'
export { probeMedia, hasWebCodecs, isCanceled, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
