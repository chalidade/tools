import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * A browser only starts a Worker from a script on the page's own origin, and
 * this package is loaded from a CDN, so the analysis worker is inlined (Vite
 * starts it from a blob: URL) instead of emitted next to element.js.
 */
const inlineWorker: Plugin = {
  name: 'bpm-key-inline-worker',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('/tools/bpm-key/BpmKey.tsx')) return
    const call = "new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })"
    if (!code.includes(call)) this.error('BpmKey.tsx no longer starts its worker as expected')
    return `import AnalysisWorker from './worker.ts?worker&inline'\n${code.replace(call, 'new AnalysisWorker()')}`
  },
}

// Library build of the site's bpm-key tool. React is bundled, so a page
// needs nothing but one <script type="module">.
export default defineConfig({
  plugins: [inlineWorker, react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // Links to the other tools (lib/route pageUrl) go to the site, not the host page.
    'import.meta.env.BASE_URL': JSON.stringify('https://chalidade.github.io/tools/'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: { index: 'src/index.ts', element: 'src/element.tsx' },
      formats: ['es'],
    },
    rollupOptions: {
      output: { chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
})
