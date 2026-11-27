import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import { getLang } from '@/lib/i18n'
import { App } from './App'
import { startLicense } from './license'
import { startTrial } from './trial'

// Theme: the stored choice from the toggle, else dark (the site's default).
try {
  if (localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark')
} catch {
  // ignore
}
document.documentElement.lang = getLang()

void startLicense()
void startTrial()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
