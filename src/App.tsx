import { Header } from '@/components/Header'
import { ToolGrid } from '@/components/ToolGrid'
import { ToolView } from '@/components/ToolView'
import { Footer } from '@/components/Footer'
import { useHashRoute } from '@/lib/use-hash-route'
import { findTool } from '@/tools/registry'

function App() {
  const tool = findTool(useHashRoute())

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">{tool ? <ToolView tool={tool} /> : <ToolGrid />}</main>
      <Footer />
    </div>
  )
}

export default App
