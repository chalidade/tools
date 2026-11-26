// Renders the WordPress.org listing assets (banners, icons) from art.html and
// copies the screenshots, into packages/_wordpress/out/wporg/<slug>/: the
// files for the plugin's SVN assets/ folder.
//
//   node packages/_wordpress/wporg/render.mjs

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const OUT = join(HERE, '..', 'out', 'wporg')
const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find((c) => {
  try { execFileSync('which', [c], { stdio: 'ignore' }); return true } catch { return false }
})
if (!chrome) throw new Error('needs Chrome or Chromium')
const logo = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8').match(/const MARK =\s*'([^']+)'/)[1]

function shot(query, width, height, file, scale = 1) {
  const profile = mkdtempSync(join(tmpdir(), 'wporg-'))
  try {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`, `--force-device-scale-factor=${scale}`, '--virtual-time-budget=4000',
      `--screenshot=${file}`, `file://${join(HERE, 'art.html')}?${query}&logo=${encodeURIComponent(logo)}`,
    ], { stdio: 'ignore' })
  } finally {
    rmSync(profile, { recursive: true, force: true })
  }
}

for (const plugin of ['toowl', 'toowl-image-optimizer']) {
  const dir = join(OUT, plugin)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  shot(`plugin=${plugin}&kind=banner`, 1544, 500, join(dir, 'banner-1544x500.png'))
  shot(`plugin=${plugin}&kind=banner`, 1544, 500, join(dir, 'banner-772x250.png'), 0.5)
  shot(`plugin=${plugin}&kind=icon`, 256, 256, join(dir, 'icon-256x256.png'))
  shot(`plugin=${plugin}&kind=icon`, 256, 256, join(dir, 'icon-128x128.png'), 0.5)
  const shots = join(HERE, plugin)
  if (existsSync(shots)) for (const f of readdirSync(shots).filter((f) => /^screenshot-\d+\.(png|jpg)$/.test(f))) cpSync(join(shots, f), join(dir, f))
  console.log(`${plugin}: ${readdirSync(dir).join(', ')}`)
}
