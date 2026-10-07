import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Library build of the site's screen recorder. Everything (React included) is
// bundled, so a page needs nothing but one <script type="module">. Mediabunny
// and its AAC encoder stay separate chunks, fetched only when converting to MP4.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
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
