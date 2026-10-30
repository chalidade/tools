import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Library build of the site's crop-resize-image tool. React is bundled, so a page
// needs nothing but one <script type="module">.
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
