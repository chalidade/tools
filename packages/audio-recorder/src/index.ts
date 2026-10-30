// The headless API: the helpers around a recording. The source lives with the
// site (src/tools/audio-recorder/recorder.ts), so the tool on
// chalidade.github.io/tools and this package are the same code.
//
//   import { canRecord, pickMimeType, convertRecording } from '@chalidade/audio-recorder'
//   const mimeType = pickMimeType()                       // 'audio/webm;codecs=opus' in Chrome
//   …record with MediaRecorder…
//   const mp3 = await convertRecording(recording, 'mp3', onProgress, onStart)

export { canRecord, pickMimeType, extensionOf, convertRecording, type Recording } from '@/tools/audio-recorder/recorder'
export type { AudioOut } from '@/lib/media'
