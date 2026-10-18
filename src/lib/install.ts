import { useSyncExternalStore } from 'react'

/*
 * "Install as an app". Chrome/Edge/Samsung Internet fire beforeinstallprompt,
 * which we keep and replay when the visitor taps the button. iPhone/iPad
 * Safari have no such event: installing is "Share → Add to Home Screen", so
 * there we only explain how. Nothing shows once the site runs as the app.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Call once at start-up, before React renders: the event can fire early. */
export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

/** 'prompt' = we can show the browser's install dialog; 'ios' = explain the Share menu; null = nothing to offer. */
export function useInstall(): 'prompt' | 'ios' | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => (isStandalone() ? null : deferred ? 'prompt' : isIos() ? 'ios' : null),
  )
}

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice.catch(() => null)
  deferred = null
  emit()
}
