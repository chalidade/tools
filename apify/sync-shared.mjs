// Copies apify/_shared/*.js into every Actor's src/ (Apify builds each Actor
// folder on its own, so they cannot import from a sibling folder).
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname)
const shared = fs.readdirSync(path.join(root, '_shared')).filter((f) => f.endsWith('.js'))
for (const dir of fs.readdirSync(root)) {
  const src = path.join(root, dir, 'src')
  if (dir.startsWith('_') || !fs.existsSync(path.join(root, dir, '.actor'))) continue
  // batch.js goes everywhere; the others only where an Actor imports them.
  const code = fs.readdirSync(src).filter((f) => !shared.includes(f)).map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n')
  const used = shared.filter((f) => f === 'batch.js' || code.includes(`./${f}`))
  for (const f of used) fs.copyFileSync(path.join(root, '_shared', f), path.join(src, f))
  console.log(`synced ${used.join(', ')} → ${dir}/src/`)
}
