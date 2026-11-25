import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The kit's dist/ sits two folders up; in your app, copy dist/ into your
// project (e.g. src/vendor/toowl/) and import it from there.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['../..'] } },
})
