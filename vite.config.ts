import { defineConfig, type Plugin } from 'vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Emits sw.js (from pwa/sw.js) with this build's app shell — index.html plus
 * the entry chunk, the chunks it imports statically, and their CSS — and a
 * version derived from those file names, so each deploy installs a fresh
 * worker. Tool chunks are left out on purpose: they are cached on first use.
 */
function serviceWorker(): Plugin {
  return {
    name: 'tools-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const core = new Set<string>(['index.html'])
      const visit = (name: string) => {
        const chunk = bundle[name]
        if (!chunk || chunk.type !== 'chunk' || core.has(name)) return
        core.add(name)
        chunk.viteMetadata?.importedCss.forEach((css) => core.add(css))
        chunk.imports.forEach(visit)
      }
      for (const [name, chunk] of Object.entries(bundle)) if (chunk.type === 'chunk' && chunk.isEntry) visit(name)
      const list = [...core].sort()
      const version = createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 12)
      const template = readFileSync(fileURLToPath(new URL('./pwa/sw.js', import.meta.url)), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        // Replace the code tokens, not their mentions in the header comment.
        source: template.replace("= '__VERSION__'", `= '${version}'`).replace('= __CORE__', `= ${JSON.stringify(list)}`),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
