// Free users get PRO.freeSavesPerDay saves from Pro tools each day, so they
// can see a tool work before paying. Counted per install, local date.

import { useSyncExternalStore } from 'react'
import { PRO } from './config'

const KEY = 'trial'
const today = () => new Date().toLocaleDateString('sv') // YYYY-MM-DD, local

let used = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())
const hasChrome = () => typeof chrome !== 'undefined' && !!chrome.storage?.local

export async function startTrial() {
  const raw = hasChrome() ? (await chrome.storage.local.get(KEY))[KEY] : JSON.parse(localStorage.getItem('toowl:trial') ?? 'null')
  const t = raw as { day: string; used: number } | undefined | null
  used = t?.day === today() ? t.used : 0
  emit()
}

export async function useOneSave() {
  const t = { day: today(), used: (await currentUsed()) + 1 }
  used = t.used
  if (hasChrome()) await chrome.storage.local.set({ [KEY]: t })
  else localStorage.setItem('toowl:trial', JSON.stringify(t))
  emit()
}

async function currentUsed() {
  await startTrial()
  return used
}

/** Pro saves left today for a free user. */
export function useSavesLeft() {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => Math.max(0, PRO.freeSavesPerDay - used),
  )
}
