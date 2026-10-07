import { useEffect } from 'react'
import { Header } from '@/components/Header'
import { Playground } from '@/components/Playground'
import { ToolGrid } from '@/components/ToolGrid'
import { HowItWorks } from '@/components/HowItWorks'
import { ToolView } from '@/components/ToolView'
import { Footer } from '@/components/Footer'
import { hashQuery, useHashRoute } from '@/lib/use-hash-route'
import { findTool } from '@/tools/registry'
import { getLang, setLang, useLang } from '@/lib/i18n'

function App() {
  const tool = findTool(useHashRoute())

  // #/<tool>?embed — the tool alone, for an iframe on someone else's site.
  const query = hashQuery()
  // ?lang=en|id in the link picks the language (embeds use it); the first
  // page load already read it in i18n.ts, this follows later hash changes.
  const asked = query.get('lang')
  useEffect(() => {
    if ((asked === 'en' || asked === 'id') && asked !== getLang()) setLang(asked)
  }, [asked])
  const lang = useLang()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  useEffect(() => {
    if (!tool)
      document.title =
        lang === 'en' ? 'Tools — Free tools that run in your browser' : 'Tools — Kumpulan tools gratis, langsung di browser'
  }, [tool, lang])
  if (tool && query.has('embed')) {
    const theme = query.get('theme')
    if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark')
    return <ToolView tool={tool} embed />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        {tool ? (
          <ToolView tool={tool} />
        ) : (
          <>
            <Playground />
            <ToolGrid />
            <HowItWorks />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App
