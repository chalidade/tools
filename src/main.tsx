import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { listenForInstall } from './lib/install'

listenForInstall()
// Offline + installable app. Not in dev (it would cache the dev server), and
// not inside an embed on someone else's site.
if ('serviceWorker' in navigator && import.meta.env.PROD && !location.hash.includes('embed')) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
