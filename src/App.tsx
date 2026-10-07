import { Header } from '@/components/Header'
import { Playground } from '@/components/Playground'
import { ToolGrid } from '@/components/ToolGrid'
import { HowItWorks } from '@/components/HowItWorks'
import { ToolView } from '@/components/ToolView'
import { Footer } from '@/components/Footer'
import { hashQuery, useHashRoute } from '@/lib/use-hash-route'
import { findTool } from '@/tools/registry'

function App() {
  const tool = findTool(useHashRoute())

  // #/<tool>?embed — the tool alone, for an iframe on someone else's site.
  const query = hashQuery()
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
