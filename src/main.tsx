import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { listenForInstall } from './lib/install'
import { getRoute, settleUrl } from './lib/route'
import { setLang } from './lib/i18n'

// Old #/<slug> links become paths, then the first render speaks the language
// of the address (a crawler gets the page it asked for, not its browser's).
settleUrl()
const { lang, embed } = getRoute()
if (lang) setLang(lang, { remember: false })

listenForInstall()
// Offline + installable app. Not in dev (it would cache the dev server), and
// not inside an embed on someone else's site.
if ('serviceWorker' in navigator && import.meta.env.PROD && !embed) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
