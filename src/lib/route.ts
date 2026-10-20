import { useEffect, useSyncExternalStore } from 'react'
import type { Lang } from '@/lib/i18n'

// Every page has a real address, so a search engine can list each tool on its
// own: /tools/<slug>/ (Indonesian) and /tools/en/<slug>/ (English). The build
// writes an index.html into each of those folders (scripts/seo.mjs), which is
// why a reload never 404s on GitHub Pages. The language is part of the
// address: an Indonesian URL always renders Indonesian, also for a crawler
// that announces another browser language.
//
// The old hash links (#/<slug>) still work: they are rewritten to the path on
// load. Embeds stay on the hash form (#/<slug>?embed), which the embed
// snippets on other people's sites already use.

const BASE = import.meta.env.BASE_URL
const STORED = 'tools:lang'

export interface Route {
  slug: string
  /** The language in the address; null for a hash link that names none. */
  lang: Lang | null
  embed: boolean
}

function hashParts() {
  const [path = '', query = ''] = location.hash.replace(/^#\/?/, '').split('?')
  return { path, query: new URLSearchParams(query) }
}

function read(): Route {
  const hash = hashParts()
  let rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : ''
  let lang: Lang | null = 'id'
  if (rest === 'en' || rest.startsWith('en/')) {
    lang = 'en'
    rest = rest.slice(3)
  }
  if (location.hash.startsWith('#/')) {
    const asked = hash.query.get('lang')
    return {
      slug: hash.path,
      lang: asked === 'en' || asked === 'id' ? asked : location.pathname === BASE ? null : lang,
      embed: hash.query.has('embed'),
    }
  }
  return { slug: rest.split('/')[0] ?? '', lang, embed: new URLSearchParams(location.search).has('embed') }
}

/** The address of a page: home when slug is empty. */
export function pageUrl(slug: string, lang: Lang, query = '') {
  return `${BASE}${lang === 'en' ? 'en/' : ''}${slug ? `${slug}/` : ''}${query ? `?${query}` : ''}`
}

/**
 * Runs once, before the first render: turns an old #/<slug> link into its
 * path, and honours a language the visitor chose before (stored by the
 * header switch) by moving to that language's address. A crawler has no
 * stored choice, so it always stays on the address it asked for.
 */
export function settleUrl() {
  const hash = hashParts()
  if (location.hash.startsWith('#/') && !hash.query.has('embed')) {
    const asked = hash.query.get('lang')
    hash.query.delete('lang')
    const lang: Lang = asked === 'en' || asked === 'id' ? asked : storedLang() ?? 'id'
    history.replaceState(null, '', pageUrl(hash.path, lang, hash.query.toString()))
  }
  const route = read()
  const stored = storedLang()
  if (!route.embed && route.lang && stored && stored !== route.lang)
    history.replaceState(null, '', pageUrl(route.slug, stored, location.search.slice(1)))
  current = read()
}

function storedLang(): Lang | null {
  try {
    const saved = localStorage.getItem(STORED)
    return saved === 'id' || saved === 'en' ? saved : null
  } catch {
    return null
  }
}

let current = read()
const listeners = new Set<() => void>()
const changed = () => {
  current = read()
  listeners.forEach((f) => f())
}

/** Moves to another page of the site without a reload. */
export function navigate(href: string) {
  history.pushState(null, '', href)
  window.scrollTo({ top: 0 })
  changed()
}

function subscribe(f: () => void) {
  listeners.add(f)
  return () => listeners.delete(f)
}

export const getRoute = () => current

/** The current page; re-renders when it changes. */
export const useRoute = () => useSyncExternalStore(subscribe, getRoute, getRoute)

/** Query parameters of the page: ?bpm=128, or #/<slug>?embed&theme=light for an embed. */
export function routeQuery() {
  return location.hash.startsWith('#/') ? hashParts().query : new URLSearchParams(location.search)
}

/**
 * Same-site links (<a href="/tools/…">) switch pages without a reload. Plain
 * anchors stay real links, so they keep working without JavaScript, open in a
 * new tab with Ctrl/⌘-click, and are followed by crawlers.
 */
export function useLinkNavigation() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || a.target || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || !url.pathname.startsWith(BASE) || url.hash) return
      e.preventDefault()
      if (url.pathname + url.search !== location.pathname + location.search) navigate(url.pathname + url.search)
    }
    const onPop = () => changed()
    document.addEventListener('click', onClick)
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [])
}
