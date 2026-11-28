// Bundles the site's text-to-speech helpers (src/tools/text-to-speech) into src/engine.js.
// Run from the repo root after `npm install`: node apify/text-to-speech/build-engine.mjs
import path from 'node:path'
import { bundleEngine } from '../bundle-engine.mjs'

await bundleEngine({
  here: path.dirname(new URL(import.meta.url).pathname),
  name: 'src/tools/text-to-speech',
  external: ['espeak-ng'],
})
