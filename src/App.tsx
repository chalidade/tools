import { useEffect } from 'react'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { ToolGrid } from '@/components/ToolGrid'
import { HowItWorks } from '@/components/HowItWorks'
import { ToolView } from '@/components/ToolView'
import { Footer } from '@/components/Footer'
import { SearchHome } from '@/components/SearchHome'
import { SupportToast } from '@/components/SupportToast'
import { routeQuery, useLinkNavigation, useRoute } from '@/lib/route'
import { applyHead, homeMeta } from '@/lib/seo'
import { findTool } from '@/tools/registry'
import { getLang, setLang, useLang } from '@/lib/i18n'

function App() {
  useLinkNavigation()
  const route = useRoute()
  const tool = findTool(route.slug)

  // The address decides the language (/tools/en/… is English); a hash link
  // without one, like an embed, keeps the visitor's own language.
  useEffect(() => {
    if (route.lang && route.lang !== getLang()) setLang(route.lang, { remember: false })
  }, [route.lang])
  const lang = useLang()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  useEffect(() => {
    if (!tool) applyHead(homeMeta(lang))
  }, [tool, lang])
  // #/<tool>?embed — the tool alone, for an iframe on someone else's site.
  if (tool && route.embed) {
    const theme = routeQuery().get('theme')
    if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark')
    return <ToolView tool={tool} embed />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        {tool ? (
          <ToolView tool={tool} />
        ) : route.slug === 'all' ? (
          <>
            <Hero />
            <ToolGrid />
            <HowItWorks />
          </>
        ) : (
          <SearchHome />
        )}
      </main>
      <Footer />
      <SupportToast />
    </div>
  )
}

export default App
