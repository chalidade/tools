// The headless API. The source lives with the site (src/tools/change-speed/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { probeMedia, changeSpeed } from '@chalidade/change-speed'
//   const info = await probeMedia(file)
//   const blob = await changeSpeed(file, info, { speed: 1.5, keepPitch: true, keepAudio: true, audioOut: 'mp3' }, onProgress, onStart)

export { changeSpeed, outputFor, type SpeedOptions } from '@/tools/change-speed/speed'
export { TimeStretch, Resample, type SpeedProcessor } from '@/tools/change-speed/stretch'
export { probeMedia, hasWebCodecs, isCanceled, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
