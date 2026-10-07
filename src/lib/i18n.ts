// The site speaks Indonesian and English. Text is written in both languages
// right where it is used — t('Pilih file', 'Choose a file') — rather than in a
// separate dictionary, so a string and its translation can't drift apart.
//
// In components: const t = useT(); then t(id, en). Anything that renders text
// re-renders when the language changes.
// Outside components (error messages, generated file names): tr(id, en),
// which reads the language at the moment it's called.

import { useCallback, useSyncExternalStore } from 'react'

export type Lang = 'id' | 'en'

const KEY = 'tools:lang'

function detect(): Lang {
  // A link can ask for a language: #/<tool>?lang=en (iframe embeds use this).
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.hash.split('?')[1] ?? '').get('lang')
  if (asked === 'id' || asked === 'en') return asked
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'id' || saved === 'en') return saved
  } catch {
    // Storage blocked: fall back to the browser's language.
  }
  // Indonesian (and Malay) readers get Indonesian; everyone else English.
  const langs = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])
  return langs.some((l) => /^(id|ms)\b/i.test(l)) ? 'id' : 'en'
}

let current: Lang = detect()
const listeners = new Set<() => void>()

export const getLang = () => current

/**
 * Switches the language. The site remembers the choice and marks <html lang>;
 * an embedded package passes `{ page: false }` so it never touches the host
 * page's attributes or storage.
 */
export function setLang(next: Lang, { page = true }: { page?: boolean } = {}) {
  if (page) {
    document.documentElement.lang = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // The choice lasts for this page view only.
    }
  }
  if (next === current) return
  current = next
  listeners.forEach((f) => f())
}

function subscribe(f: () => void) {
  listeners.add(f)
  return () => listeners.delete(f)
}

/** The current language; re-renders the component when it changes. */
export const useLang = () => useSyncExternalStore(subscribe, getLang, getLang)

/** t(id, en) → the text in the current language. */
export function useT() {
  const lang = useLang()
  return useCallback((id: string, en: string) => (lang === 'en' ? en : id), [lang])
}

/** The same choice outside React, read at call time. */
export const tr = (id: string, en: string) => (current === 'en' ? en : id)

/** For toLocaleString / toLocaleDateString. */
export const locale = () => (current === 'en' ? 'en-US' : 'id-ID')
