import { createElement, useEffect, useState } from 'react'

// Every element in the kit, by tag. Importing an element module registers it;
// here each one loads only when its tab is opened.
const TOOLS: Record<string, string> = {{TOOLS_JSON}}

export default function App() {
  const tags = Object.keys(TOOLS)
  const [tag, setTag] = useState(tags[0])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    import(`../../../dist/elements/${TOOLS[tag]}.js`).then(() => setReady(true))
  }, [tag])

  return (
    <main style={{ maxWidth: 980, margin: '24px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>{{TITLE}} in React</h1>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tags.map((t) => (
          <button key={t} onClick={() => setTag(t)} aria-pressed={t === tag}>
            {`<${t}>`}
          </button>
        ))}
      </nav>
      {/* React 19 passes these through as attributes on the custom element. */}
      {ready && createElement(tag, { theme: 'light', lang: 'en', style: { display: 'block', borderRadius: 16, overflow: 'hidden' } })}
    </main>
  )
}
