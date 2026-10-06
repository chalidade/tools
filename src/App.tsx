import { Header } from '@/components/Header'
import { Playground } from '@/components/Playground'
import { ToolGrid } from '@/components/ToolGrid'
import { HowItWorks } from '@/components/HowItWorks'
import { ToolView } from '@/components/ToolView'
import { Footer } from '@/components/Footer'
import { useHashRoute } from '@/lib/use-hash-route'
import { findTool } from '@/tools/registry'

function App() {
  const tool = findTool(useHashRoute())

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
