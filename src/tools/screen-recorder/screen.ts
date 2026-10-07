// Screen recording with the browser's own capture and MediaRecorder: the
// screen, a window or a tab via getDisplayMedia, optionally mixed with the
// microphone. Recordings are kept in IndexedDB on this device.

import { convertMedia, ensureAudioEncoder, NoEncoderError } from '@/lib/media'
import { tr } from '@/lib/i18n'
import { localStore, timestampName } from '@/lib/local-store'

export interface ScreenRecording {
  id: string
  name: string
  createdAt: number
  /** Seconds, measured while recording (MediaRecorder's WebM carries none). */
  duration: number
  mimeType: string
  width: number
  height: number
  blob: Blob
}

/** getDisplayMedia exists on desktop browsers only — not on Android or iOS. */
export const canRecordScreen = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined'

/** VP9 when available (sharper text for the same size), else VP8, else MP4 (Safari). */
export function pickVideoMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export const videoExtension = (mimeType: string) => (mimeType.includes('mp4') ? 'mp4' : 'webm')

/**
 * One audio track out of the shared tab/system sound and the microphone.
 * A recorder takes a single audio track, so two sources are mixed through
 * Web Audio. Returns the track plus a cleanup.
 */
export function mixAudio(tracks: MediaStreamTrack[]) {
  if (tracks.length <= 1) return { track: tracks[0] as MediaStreamTrack | undefined, close: () => {} }
  const ctx = new AudioContext()
  const out = ctx.createMediaStreamDestination()
  for (const t of tracks) ctx.createMediaStreamSource(new MediaStream([t])).connect(out)
  return { track: out.stream.getAudioTracks()[0], close: () => void ctx.close() }
}

export interface CaptureOptions {
  /** Ask for the tab's / system's sound (the visitor still ticks "share audio" in the picker). Default true. */
  systemAudio?: boolean
  /** Mix in the microphone. Default true. */
  microphone?: boolean
  /** 30 or 60. Default 30. */
  fps?: number
  /** Default 5 Mbps at 30 fps, 8 Mbps at 60. */
  videoBitsPerSecond?: number
}

export interface RecordingResult {
  blob: Blob
  mimeType: string
  /** Seconds of actual recording, pauses excluded. */
  duration: number
  width: number
  height: number
}

/** Something that didn't make it into the recording, for the UI to explain. */
export type CaptureWarning = 'system-audio-missing' | 'microphone-unavailable'

export interface Capture {
  /** The shared screen, for a live preview. */
  readonly stream: MediaStream
  readonly width: number
  readonly height: number
  readonly warnings: CaptureWarning[]
  readonly state: 'ready' | 'recording' | 'paused' | 'stopped'
  /** Seconds recorded so far, pauses excluded. */
  elapsed(): number
  /** Begin recording. Separate from capture so a UI can count down first. */
  start(): void
  pause(): void
  resume(): void
  /** Finish and get the file (null if nothing was recorded). Releases the screen and microphone. */
  stop(): Promise<RecordingResult | null>
  /** Throw the take away and release everything. */
  cancel(): void
  /** Called when the visitor ends sharing from the browser's own "Stop sharing" bar. */
  onended: (() => void) | null
}

/**
 * Opens the browser's screen picker and gets everything ready to record: the
 * screen, window or tab, its sound and the microphone mixed into one track.
 * Must be called from a click (browsers require a user gesture).
 */
export async function captureScreen(options: CaptureOptions = {}): Promise<Capture> {
  const { systemAudio = true, microphone = true, fps = 30 } = options
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: fps }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: systemAudio,
    // Chrome: offer "share system audio" and let the visitor switch tabs mid-share.
    ...({ systemAudio: 'include', surfaceSwitching: 'include' } as object),
  } as DisplayMediaStreamOptions)
  const owned: MediaStream[] = [display]
  const warnings: CaptureWarning[] = []

  const audioTracks = [...display.getAudioTracks()]
  if (systemAudio && !audioTracks.length) warnings.push('system-audio-missing')
  if (microphone) {
    try {
      const voice = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      owned.push(voice)
      audioTracks.push(...voice.getAudioTracks())
    } catch {
      warnings.push('microphone-unavailable')
    }
  }

  const [video] = display.getVideoTracks()
  const { width = 0, height = 0 } = video.getSettings()
  const mixed = mixAudio(audioTracks)
  const mimeType = pickVideoMimeType()
  const recorder = new MediaRecorder(new MediaStream([video, ...(mixed.track ? [mixed.track] : [])]), {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: options.videoBitsPerSecond ?? (fps > 30 ? 8_000_000 : 5_000_000),
    audioBitsPerSecond: 128_000,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

  // Time recorded = finished stretches + the running one.
  let done = 0
  let since = 0
  const elapsed = () => (done + (since ? performance.now() - since : 0)) / 1000
  let state: Capture['state'] = 'ready'

  const release = () => {
    owned.forEach((s) => s.getTracks().forEach((t) => t.stop()))
    mixed.close()
  }

  const capture: Capture = {
    stream: display,
    width,
    height,
    warnings,
    get state() {
      return state
    },
    elapsed,
    start() {
      if (state !== 'ready') return
      since = performance.now()
      // A chunk every second, so a long take never sits in one giant buffer.
      recorder.start(1000)
      state = 'recording'
    },
    pause() {
      if (state !== 'recording') return
      recorder.pause()
      done = elapsed() * 1000
      since = 0
      state = 'paused'
    },
    resume() {
      if (state !== 'paused') return
      recorder.resume()
      since = performance.now()
      state = 'recording'
    },
    stop() {
      if (state === 'stopped') return Promise.resolve(null)
      const duration = elapsed()
      const wasRecording = state !== 'ready'
      state = 'stopped'
      if (!wasRecording) {
        release()
        return Promise.resolve(null)
      }
      return new Promise((resolve) => {
        recorder.onstop = () => {
          release()
          const type = recorder.mimeType || mimeType || 'video/webm'
          const blob = new Blob(chunks, { type })
          resolve(blob.size ? { blob, mimeType: type, duration, width, height } : null)
        }
        recorder.stop()
      })
    },
    cancel() {
      if (state === 'stopped') return
      state = 'stopped'
      recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
      release()
    },
    onended: null,
  }
  video.addEventListener('ended', () => capture.onended?.())
  return capture
}

/** Capture and start straight away — the one-call version for code that has its own UI. */
export async function recordScreen(options?: CaptureOptions) {
  const capture = await captureScreen(options)
  capture.start()
  return capture
}

const store = localStore<ScreenRecording>('tools-screen-recorder')
export const listScreenRecordings = store.list
export const saveScreenRecording = store.save
export const deleteScreenRecording = store.remove
export const defaultScreenName = () => timestampName(tr('Rekaman layar', 'Screen recording'))

/** Re-encodes a recording to MP4 (H.264 when the browser can, AAC audio) — the format every player and app accepts. */
export async function toMp4(
  recording: Blob,
  onProgress: (p: number) => void = () => {},
  onStart: (cancel: () => void) => void = () => {},
) {
  const hasAac = await ensureAudioEncoder('aac')
  return convertMedia({
    file: new File([recording], `rekaman.${videoExtension(recording.type)}`, { type: recording.type }),
    mimeType: 'video/mp4',
    format: (mb) => new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    video: async (mb, { width, height }) => {
      // Screen content is mostly still: ~0.08 bits per pixel per frame at 30 fps keeps text crisp.
      const bitrate = Math.round(Math.min(12_000_000, width * height * 30 * 0.08))
      const codec = await mb.getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width, height, bitrate })
      if (!codec) throw new NoEncoderError('video')
      // H.264 needs even dimensions; a shared window can be any size.
      return { codec, bitrate, width: width - (width % 2), height: height - (height % 2), fit: 'fill', forceTranscode: true }
    },
    audio: hasAac ? { codec: 'aac', bitrate: 128_000 } : { discard: true },
    onProgress,
    onStart,
  })
}
