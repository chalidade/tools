// The headless API. The source lives with the site (src/tools/extract-frames/frames.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { probeMedia, plannedTimes, captureFrames } from '@chalidade/extract-frames'
//   const { duration } = await probeMedia(file)
//   await captureFrames(file, plannedTimes(duration, 'count', 5), 'png', onFrame, onProgress, () => false)

export {
  plannedTimes,
  captureFrames,
  frameName,
  zipFrames,
  FRAME_EXT,
  type FrameFormat,
  type Frame,
} from '@/tools/extract-frames/frames'
export { probeMedia, hasWebCodecs, isCanceled, NoEncoderError, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
