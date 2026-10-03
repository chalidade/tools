import { useCallback, useState } from 'react'

type Theme = 'light' | 'dark'

// index.html applies the stored/system theme before first paint; this hook
// only reads that result and toggles it.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage blocked (private mode): the choice lasts for this page view only.
    }
    setTheme(next)
  }, [])

  return { theme, toggle }
}
