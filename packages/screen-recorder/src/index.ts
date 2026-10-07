// The headless API: record the screen from your own UI.
//
//   import { recordScreen, toMp4 } from '@chalidade/screen-recorder'
//   const capture = await recordScreen({ microphone: true })   // call from a click
//   …
//   const result = await capture.stop()                        // { blob, duration, … }
//   const mp4 = await toMp4(result.blob)
//
// The source lives with the site (src/tools/screen-recorder/screen.ts), so the
// tool on chalidade.github.io/tools and this package are the same code.

export {
  canRecordScreen,
  captureScreen,
  recordScreen,
  toMp4,
  pickVideoMimeType,
  type Capture,
  type CaptureOptions,
  type CaptureWarning,
  type RecordingResult,
} from '@/tools/screen-recorder/screen'
