// Copies apify/_shared/*.js into every Actor's src/ (Apify builds each Actor
// folder on its own, so they cannot import from a sibling folder).
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname)
const shared = fs.readdirSync(path.join(root, '_shared')).filter((f) => f.endsWith('.js'))
for (const dir of fs.readdirSync(root)) {
  const src = path.join(root, dir, 'src')
  if (dir.startsWith('_') || !fs.existsSync(path.join(root, dir, '.actor'))) continue
  for (const f of shared) fs.copyFileSync(path.join(root, '_shared', f), path.join(src, f))
  console.log(`synced ${shared.join(', ')} → ${dir}/src/`)
}
