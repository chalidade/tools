// Bundles the site's Whisper engine (src/tools/transkrip) into src/engine.js.
// Run from the repo root after `npm install`: node apify/speech-to-text/build-engine.mjs
import path from 'node:path'
import { bundleEngine } from '../bundle-engine.mjs'

await bundleEngine({ here: path.dirname(new URL(import.meta.url).pathname), name: 'src/tools/transkrip' })
