import { getRoute, navigate, pageUrl } from '@/lib/route'
import { getLang } from '@/lib/i18n'

/*
 * The iOS app (Capacitor, see capacitor.config.ts and docs/IOS.md) runs this
 * same site from files bundled in the app. A few things a browser does on its
 * own need the native side there:
 *
 * - Saving: WKWebView ignores <a download>, so downloadBlob() hands the file
 *   to saveNative(), which writes it to the app's cache and opens the share
 *   sheet ("Save to Files", AirDrop, WhatsApp, …).
 * - Opening: toowl is listed under "Open in…" for PDF, Office files, images,
 *   audio and video (CFBundleDocumentTypes in Info.plist). iOS copies the
 *   file into the app and hands over its URL; we read it, go to the tool that
 *   fits, and its FileDrop picks it up (takeIncoming).
 *
 * The Capacitor plugins are dynamic imports: the website never loads them.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  convertFileSrc?: (path: string) => string
}

const cap = () => (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor

/** True inside the iOS (or a future Capacitor Android) app; the native bridge sets window.Capacitor before our code runs. */
export const isNativeApp = () => cap()?.isNativePlatform?.() === true

export const isIosApp = () => isNativeApp() && cap()?.getPlatform?.() === 'ios'

// ---------------------------------------------------------------- saving

// Filesystem.writeFile takes base64 only; write in slices so a long video
// never needs one giant string (base64 needs a multiple of 3 bytes per slice).
const SLICE = 3 * 1024 * 1024

async function base64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Saves through the share sheet. Resolves false when the visitor closes it without choosing. */
export async function saveNative(blob: Blob, fileName: string): Promise<boolean> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, '-') || 'toowl'
  const path = `share/${Date.now()}/${safe}`
  let uri = ''
  for (let at = 0; at < blob.size || at === 0; at += SLICE) {
    const data = await base64(blob.slice(at, at + SLICE))
    if (at === 0) uri = (await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true })).uri
    else await Filesystem.appendFile({ path, data, directory: Directory.Cache })
    if (blob.size === 0) break
  }
  try {
    await Share.share({ files: [uri], title: safe })
    return true
  } catch {
    // "Share canceled": nothing saved, nothing to report.
    return false
  } finally {
    // The share sheet has copied what it needed by now.
    void Filesystem.rmdir({ path: path.slice(0, path.lastIndexOf('/')), directory: Directory.Cache, recursive: true }).catch(() => {})
  }
}

// ---------------------------------------------------------------- opening

/** Which tool opens a file handed to the app. Readers open all four document kinds. */
function toolFor(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf-reader'
  if (['docx', 'doc'].includes(ext)) return 'word-reader'
  if (['xlsx', 'xlsm', 'xls', 'csv'].includes(ext)) return 'excel-reader'
  if (['pptx', 'ppt'].includes(ext)) return 'ppt-reader'
  if (file.type.startsWith('image/') || ['heic', 'heif', 'avif', 'webp'].includes(ext)) return 'convert-image'
  if (file.type.startsWith('audio/') || file.type.startsWith('video/') || ['mp3', 'm4a', 'wav', 'flac', 'mp4', 'mov', 'mkv', 'webm'].includes(ext))
    return 'trim-media'
  return null
}

let incoming: { slug: string; file: File } | null = null
const waiting = new Set<() => void>()

/** The tool on screen. The Chrome extension (packages/_chrome) has no router and sets its own. */
let shownSlug = () => getRoute().slug
export function setShownSlug(f: () => string) {
  shownSlug = f
}

/** Hands a file to the tool `slug`'s FileDrop (now, or when it mounts). */
export function deliverIncoming(slug: string, file: File) {
  incoming = { slug, file }
  waiting.forEach((f) => f())
}

/**
 * Called by FileDrop on mount (and when a file arrives while it is shown):
 * the file handed to the app, if it is meant for the page now open.
 */
export function takeIncoming(): File | null {
  if (!incoming || incoming.slug !== shownSlug()) return null
  const { file } = incoming
  incoming = null
  return file
}

export function onIncoming(f: () => void) {
  waiting.add(f)
  return () => void waiting.delete(f)
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

async function openUrl(url: string) {
  if (!url.startsWith('file:')) return
  const name = decodeURIComponent(url.split('/').pop() ?? 'file')
  const res = await fetch(cap()?.convertFileSrc?.(url) ?? url)
  const blob = await res.blob()
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const file = new File([blob], name, { type: blob.type || MIME[ext] || '' })
  // iOS copied it into Documents/Inbox for us; we hold it in memory now.
  void import('@capacitor/filesystem').then(({ Filesystem }) => Filesystem.deleteFile({ path: url }).catch(() => {}))
  const slug = toolFor(file)
  if (!slug) return
  if (getRoute().slug !== slug) navigate(pageUrl(slug, getLang()))
  deliverIncoming(slug, file)
}

/** Call once at start-up inside the app: files opened with toowl, now and at launch. */
export async function listenForOpenedFiles() {
  const { App } = await import('@capacitor/app')
  void App.addListener('appUrlOpen', ({ url }) => void openUrl(url).catch(() => {}))
  const launch = await App.getLaunchUrl().catch(() => undefined)
  if (launch?.url) await openUrl(launch.url).catch(() => {})
}
