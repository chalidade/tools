// Builds a site template sold on marketplaces (Codester) from the toowl kits.
//
//   node packages/_templates/build.mjs masjid               → out/toowl-masjid-template-<version>.zip
//   node packages/_templates/build.mjs masjid --demo=<dir>   → the live demo site only (CI: dist/templates/masjid)
//
// A template is plain HTML/CSS/JS in <name>/template/ (no build step for the
// buyer). Its assets/toowl/ is the dist/ of the kit it uses, built here with
// the kit builder in marketplace mode (readable code), and assets/fonts/ is
// Geist from the site plus the template's own <name>/fonts/.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const TEMPLATES = {
  masjid: { title: 'Masjid: Mosque Website Template', kit: 'islamic-kit', zip: 'toowl-masjid-template', version: '1.0.0' },
}

const args = process.argv.slice(2)
const name = args.find((a) => !a.startsWith('--'))
const demo = args.find((a) => a.startsWith('--demo='))?.slice(7)
const T = TEMPLATES[name]
if (!T) {
  console.error(`usage: node packages/_templates/build.mjs <${Object.keys(TEMPLATES).join('|')}> [--demo=<dir>]`)
  process.exit(1)
}

// The kit, built for a marketplace so its code stays readable.
execFileSync('node', [join(ROOT, 'packages/_kits/build.mjs'), T.kit, '--market=codester'], { stdio: ['ignore', 'ignore', 'inherit'] })
const kitStage = join(ROOT, 'packages/_kits/out/codester/stage', `toowl-${T.kit}-1.0.0`)
if (!existsSync(join(kitStage, 'dist'))) throw new Error(`kit build missing: ${kitStage}`)

/** The site itself: template files + kit dist + fonts. */
function site(target) {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(join(HERE, name, 'template'), target, {
    recursive: true,
    filter: (src) => !/[\\/]assets[\\/](toowl|fonts)([\\/]|$)/.test(src),
  })
  cpSync(join(kitStage, 'dist'), join(target, 'assets/toowl'), {
    recursive: true,
    filter: (src) => !src.endsWith('.d.ts') && !/[\\/]types([\\/]|$)/.test(src),
  })
  mkdirSync(join(target, 'assets/fonts'), { recursive: true })
  for (const f of ['geist-latin.woff2', 'OFL.txt']) cpSync(join(ROOT, 'src/assets/fonts', f), join(target, 'assets/fonts', f))
  // The template's own typefaces (and their licenses), kept beside it.
  if (existsSync(join(HERE, name, 'fonts'))) cpSync(join(HERE, name, 'fonts'), join(target, 'assets/fonts'), { recursive: true })
}

if (demo) {
  site(resolve(ROOT, demo))
  console.log(`${name} demo → ${demo}`)
  process.exit(0)
}

const OUT = join(HERE, 'out')
const zipName = `${T.zip}-${T.version}`
const stage = join(OUT, 'stage', zipName)
site(stage)
const readme = readFileSync(join(HERE, name, 'README.md'), 'utf8')
const license = readFileSync(join(HERE, name, 'codester/LICENSE.md'), 'utf8').replaceAll('{{ZIP}}', `${zipName}.zip`)
writeFileSync(join(stage, 'README.md'), readme)
writeFileSync(join(stage, 'LICENSE.md'), license)
cpSync(join(kitStage, 'THIRD-PARTY-NOTICES.md'), join(stage, 'THIRD-PARTY-NOTICES.md'))
cpSync(join(kitStage, 'licenses'), join(stage, 'licenses'), { recursive: true })
writeDocs(join(stage, 'documentation'), T.title, readme, license)

mkdirSync(OUT, { recursive: true })
const zip = join(OUT, `${zipName}.zip`)
rmSync(zip, { force: true })
execFileSync('zip', ['-qr', '-X', zip, zipName], { cwd: join(OUT, 'stage') })
console.log(`${name} → ${zip} (${(readFileSync(zip).length / 1e6).toFixed(1)} MB)`)

/** documentation/index.html: the README as one offline page. */
function writeDocs(dir, title, md, notice) {
  mkdirSync(dir, { recursive: true })
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const slug = (s) => s.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const all = md + '\n\n' + notice.replace(/^# /m, '## ')
  const toc = [...all.matchAll(/^## (.+)$/gm)].map(([, h]) => `<li><a href="#${slug(h)}">${esc(h)}</a></li>`).join('')
  const body = marked.parse(all).replace(/<h2>(.+?)<\/h2>/g, (_, h) => `<h2 id="${slug(h.replace(/<[^>]+>/g, ''))}">${h}</h2>`)
  writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}: documentation</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; margin: 0; color: #141815; background: #f5f3ee; }
  .wrap { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 40px; max-width: 1180px; margin: auto; padding: 32px 24px 64px; }
  nav { position: sticky; top: 24px; align-self: start; font-size: 14px; }
  nav ol { padding-left: 18px; } nav a { color: #3f4a45; text-decoration: none; } nav a:hover { color: #12382d; }
  main { background: white; border: 1px solid #e4e0d5; border-radius: 14px; padding: 8px 40px 40px; }
  h1 { font-size: 30px; } h2 { margin-top: 40px; padding-top: 16px; border-top: 1px solid #f1eee6; }
  code { font: 13px/1.5 ui-monospace, monospace; background: #f3f1ea; padding: 1px 5px; border-radius: 4px; }
  pre { background: #17211d; color: #f3f1ea; padding: 16px; border-radius: 10px; overflow: auto; }
  pre code { background: none; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; display: block; overflow-x: auto; }
  th, td { border: 1px solid #e4e0d5; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f3f1ea; }
  @media (max-width: 800px) { .wrap { grid-template-columns: 1fr; } nav { position: static; } main { padding: 8px 18px 24px; } }
</style>
</head>
<body>
<div class="wrap">
  <nav><strong>${esc(title)}</strong><ol>${toc}</ol></nav>
  <main>${body}</main>
</div>
</body>
</html>
`)
}
