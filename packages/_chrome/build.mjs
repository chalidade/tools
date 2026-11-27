// Builds the Chrome extension from the site's own tool source.
//
//   node packages/_chrome/build.mjs
//
// Output: packages/_chrome/dist/ (load it unpacked in chrome://extensions)
// and packages/_chrome/out/toowl-chrome-<version>.zip (upload to the Chrome
// Web Store). The version comes from public/manifest.json.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = join(HERE, 'dist')
const OUT = join(HERE, 'out')

await build({ configFile: join(HERE, 'vite.config.ts'), logLevel: 'warn' })

// Web Store review flags any remote script URL. jsPDF carries one (PDFObject,
// only for its unused "open in new window" output): blank it.
const REMOTE = /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdfobject\/[^"'`]*/g
for (const f of readdirSync(join(DIST, 'assets'))) {
  if (!f.endsWith('.js')) continue
  const p = join(DIST, 'assets', f)
  const src = readFileSync(p, 'utf8')
  if (REMOTE.test(src)) writeFileSync(p, src.replace(REMOTE, ''))
}
const remote = /https:\/\/(cdn|unpkg|esm\.sh)/
const left = readdirSync(join(DIST, 'assets')).filter((f) => /\.(m?js|html)$/.test(f) && remote.test(readFileSync(join(DIST, 'assets', f), 'utf8')))
if (left.length) throw new Error(`remote URLs left in: ${left.join(', ')}`)

const { version } = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'))
mkdirSync(OUT, { recursive: true })
const zip = join(OUT, `toowl-chrome-${version}.zip`)
rmSync(zip, { force: true })
execFileSync('zip', ['-qr9X', zip, '.'], { cwd: DIST })
console.log(`dist/ ready, ${zip}`)
