// Bundles the site's SCNet stem separation (src/tools/vocal-remover) into src/engine.js.
// Run from the repo root after `npm install`: node apify/stem-separator/build-engine.mjs
import path from 'node:path'
import { bundleEngine } from '../bundle-engine.mjs'

await bundleEngine({
  here: path.dirname(new URL(import.meta.url).pathname),
  name: 'src/tools/vocal-remover',
})
