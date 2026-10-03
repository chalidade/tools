import { useEffect, useState } from 'react'

// Hash routing (#/doc-to-pdf) works on GitHub Pages' sub-path and inside the
// APK without any server-side rewrite — a path route would 404 on reload.
function readHash() {
  return window.location.hash.replace(/^#\/?/, '').split('?')[0]
}

export function useHashRoute() {
  const [route, setRoute] = useState(readHash)

  useEffect(() => {
    const onChange = () => {
      setRoute(readHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
