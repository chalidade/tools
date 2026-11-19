import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { listenForInstall } from './lib/install'
import { getRoute, settleUrl } from './lib/route'
import { setLang } from './lib/i18n'
import { isNativeApp, listenForOpenedFiles } from './lib/native'
import { syncPremium } from './lib/premium'

// Old #/<slug> links become paths, then the first render speaks the language
// of the address (a crawler gets the page it asked for, not its browser's).
settleUrl()
const { lang, embed } = getRoute()
if (lang) setLang(lang, { remember: false })

listenForInstall()
// The iOS app opens files from Files / the share sheet ("Open in toowl").
if (isNativeApp()) {
  void listenForOpenedFiles()
  // What this person bought in the App Store (nothing is gated yet; see lib/premium.ts).
  void syncPremium().catch(() => {})
}
// Offline + installable app. Not in dev (it would cache the dev server), not
// inside an embed on someone else's site, and not in the iOS app, which has
// every file bundled already (and whose web view has no service workers).
if ('serviceWorker' in navigator && import.meta.env.PROD && !embed && !isNativeApp()) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
