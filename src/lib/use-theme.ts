import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'

type Theme = 'light' | 'dark'

/** The browser bar on a phone follows the page background. */
const BAR = { dark: '#09090b', light: '#fafafa' }

// index.html applies the stored theme before first paint; this hook only
// reads that result and toggles it.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    const apply = () => {
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[next])
      setTheme(next)
    }
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage blocked (private mode): the choice lasts for this page view only.
    }
    // Cross-fade the two themes where the browser can; otherwise just switch.
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      document.startViewTransition(() => flushSync(apply))
    else apply()
  }, [])

  return { theme, toggle }
}
