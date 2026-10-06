// Screen recording with the browser's own capture and MediaRecorder: the
// screen, a window or a tab via getDisplayMedia, optionally mixed with the
// microphone. Recordings are kept in IndexedDB on this device.

import { convertMedia, ensureAudioEncoder, NoEncoderError } from '@/lib/media'
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

const store = localStore<ScreenRecording>('tools-screen-recorder')
export const listScreenRecordings = store.list
export const saveScreenRecording = store.save
export const deleteScreenRecording = store.remove
export const defaultScreenName = () => timestampName('Rekaman layar')

/** Re-encodes a recording to MP4 (H.264 when the browser can, AAC audio) — the format every player and app accepts. */
export async function toMp4(
  r: ScreenRecording,
  onProgress: (p: number) => void,
  onStart: (cancel: () => void) => void,
) {
  const hasAac = await ensureAudioEncoder('aac')
  return convertMedia({
    file: new File([r.blob], `${r.name}.${videoExtension(r.mimeType)}`, { type: r.mimeType }),
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
