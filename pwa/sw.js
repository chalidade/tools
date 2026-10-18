/*
 * Service worker for the installed app (and offline use). Filled in at build
 * time by the `serviceWorker` plugin in vite.config.ts:
 *   __VERSION__ — changes with every build;
 *   __CORE__    — the app shell: index.html plus the entry JS/CSS.
 *
 * Strategy:
 *  - pages (navigations): network first, so a deploy shows up at once; the
 *    cached shell when offline;
 *  - hashed build files (/assets/…): cache first — their names change when
 *    their content does, so a cached copy is never stale. Cached on first use,
 *    so a tool that was opened once works offline afterwards, without making
 *    the install download every tool's libraries up front;
 *  - other same-origin files and Google Fonts: stale-while-revalidate.
 */

const VERSION = '__VERSION__'
const CORE = __CORE__
const SHELL = `shell-${VERSION}`
const ASSETS = 'assets-v1'
const MAX_ASSETS = 300

const scoped = (path) => new URL(path, self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(CORE.map(scoped)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('shell-') && key !== SHELL) await caches.delete(key)
      }
      // Old builds' chunks pile up in the asset cache; keep the newest.
      const cache = await caches.open(ASSETS)
      const keys = await cache.keys()
      for (const req of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(req)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (url.origin !== self.location.origin && !fonts) return
  if (url.origin === self.location.origin && !url.href.startsWith(self.registration.scope)) return

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok) (await caches.open(SHELL)).put(scoped('index.html'), res.clone())
          return res
        } catch {
          return (await caches.match(scoped('index.html'))) ?? (await caches.match(scoped('./'))) ?? Response.error()
        }
      })(),
    )
    return
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) (await caches.open(ASSETS)).put(req, res.clone())
        return res
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSETS)
      const hit = await cache.match(req)
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone())
          return res
        })
        .catch(() => hit)
      return hit ?? fresh
    })(),
  )
})
