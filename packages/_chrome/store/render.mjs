// Renders the Chrome Web Store art from art.html into packages/_chrome/out/store/:
// screenshots (1280×800, English and Indonesian), the small promo tile
// (440×280) and the marquee (1400×560). JPEG for screenshots (the store
// takes JPEG or 24-bit PNG, no alpha), PNG for the tiles.
//
//   node packages/_chrome/store/render.mjs
//
// The side panel captures come from panels/<lang>/*.png (400 px wide at 2×).

import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const OUT = join(HERE, '..', 'out', 'store')
const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find((c) => {
  try {
    execFileSync('which', [c], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})
if (!chrome) throw new Error('needs Chrome or Chromium')
const logo = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8').match(/const MARK =\s*'([^']+)'/)[1]

function shot(query, width, height, file) {
  const profile = mkdtempSync(join(tmpdir(), 'cws-'))
  try {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`, '--force-device-scale-factor=1', '--virtual-time-budget=4000',
      `--screenshot=${file}`, `file://${join(HERE, 'art.html')}?${query}&logo=${encodeURIComponent(logo)}`,
    ], { stdio: 'ignore' })
  } finally {
    rmSync(profile, { recursive: true, force: true })
  }
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const lang of ['en', 'id'])
  for (let n = 1; n <= 5; n++) {
    const png = join(OUT, `screenshot-${lang}-${n}.png`)
    shot(`kind=shot&n=${n}&lang=${lang}`, 1280, 800, png)
    execFileSync('convert', [png, '-quality', '92', png.replace(/\.png$/, '.jpg')])
    rmSync(png)
  }
shot('kind=tile&lang=en', 440, 280, join(OUT, 'promo-small-440x280.png'))
shot('kind=marquee&lang=en', 1400, 560, join(OUT, 'promo-marquee-1400x560.png'))
console.log(`store art in ${OUT}`)
