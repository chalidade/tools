import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Chrome extension: the side panel (sidepanel.html) renders the site's own
// tool components (alias @ → ../../src, never a copy); background.js is the
// service worker. Everything, wasm included, ships inside the extension:
// Manifest V3 forbids remote code, and the site's tools never fetch any.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // The side panel is a local page: no need to split for first paint, but keep tools lazy.
    chunkSizeWarningLimit: 4000,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        sidepanel: fileURLToPath(new URL('sidepanel.html', import.meta.url)),
        background: fileURLToPath(new URL('src/background.ts', import.meta.url)),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})
