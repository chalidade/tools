// Builds a developer kit ZIP for Gumroad or CodeCanyon (Envato Market).
//
//   node packages/_kits/build.mjs pdf-toolkit                  one kit (Gumroad)
//   node packages/_kits/build.mjs all                          every kit and every single
//   node packages/_kits/build.mjs all --market=envato          the CodeCanyon kits
//   node packages/_kits/build.mjs all --market=codester        the Codester kits
//   node packages/_kits/build.mjs --preview=dist/kit-preview   the CodeCanyon live preview (implies envato)
//
// --market=envato|codester swaps in template/<market>/ (LICENSE.md under the Envato
// Market licenses, CodeCanyon support text), adds documentation/index.html,
// never links a Gumroad page, and writes to out/<market>/. Singles are Gumroad
// only. --preview builds the complete kit once and writes a static demo page
// for every kit (no store links: Envato's live preview rules), which CI puts
// at https://toowl.my.id/kit-preview/.
//
// Output: packages/_kits/out/[envato/]toowl-<kit>-<version>.zip, holding
//   dist/                  index.js (headless API, all tools), all.js (every
//                          element), elements/<tool>.js, <tool>.js (that tool's
//                          headless API), chunks/, .d.ts for all of them
//   examples/html          every element on one page (open with a local server)
//   examples/react         a Vite + React app using the elements
//   README.md, LICENSE.md (commercial), THIRD-PARTY-NOTICES.md, licenses/, CHANGELOG.md
//
// The source is the site's own (src/tools/<tool>/ via each package's
// src/element.tsx and src/index.ts), so a kit is the same code as toowl.my.id.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { marked } from 'marked'
import { ALL_KITS, CODESTER, ENVATO_KITS, KITS, PREVIEW_URL, VERSION, kit as getKit } from './kits.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGES = join(HERE, '..')
const ROOT = join(PACKAGES, '..')
const TEMPLATE = join(HERE, 'template')
const ARGS = process.argv.slice(2)
const flag = (name) => ARGS.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const MARKET = flag('market') ?? (flag('preview') ? 'envato' : 'gumroad')
/** Marketplaces: their own license (template/<market>/LICENSE.md), no links to other stores. */
const STORES = {
  envato: { name: 'CodeCanyon', license: 'Envato Market license', licenseUrl: 'https://codecanyon.net/licenses/standard', small: 'the **Regular License** covers one end product whose users are not charged, the\n**Extended License** one end product that users pay for; buy one license per end\nproduct', downloads: 'CodeCanyon\nDownloads page', support: 'the Support tab or the\nComments on the item page' },
  codester: { name: 'Codester', license: 'Codester license', licenseUrl: 'https://www.codester.com/info/licenses', small: 'the **Regular License** covers one project, the **Extended License** any number of\nprojects', downloads: 'Codester\nDownloads page', support: 'the item\'s comments on\nCodester or a message to the author there' },
}
if (MARKET !== 'gumroad' && !STORES[MARKET]) throw new Error(`unknown market ${MARKET}`)
const STORE = STORES[MARKET]
const ENVATO = Boolean(STORE) // a marketplace build (Envato or Codester)
const OUT = ENVATO ? join(HERE, 'out', MARKET) : join(HERE, 'out')
const WORK = join(HERE, '.work')
/** A template file, from template/envato/ when that market overrides it. */
const templateFile = (file) => (ENVATO && existsSync(join(TEMPLATE, MARKET, file)) ? join(TEMPLATE, MARKET, file) : join(TEMPLATE, file))

const read = (p) => readFileSync(p, 'utf8')
const pkg = (tool) => JSON.parse(read(join(PACKAGES, tool, 'package.json')))
const tagOf = (tool) => {
  const src = read(join(PACKAGES, tool, 'src/element.tsx'))
  const m = src.match(/tag: '([a-z0-9-]+)'/) ?? src.match(/customElements\.define\('([a-z0-9-]+)'/)
  if (!m) throw new Error(`${tool}: no element tag found`)
  return m[1]
}
const hasApi = (tool) => existsSync(join(PACKAGES, tool, 'src/index.ts'))
const NAME = /^export (?:declare )?(function|class|type|interface|const|enum) ([A-Za-z0-9_]+)/gm

/** bpm-key starts its worker from a URL, which a CDN or another origin refuses: inline it (as its package does). */
const inlineWorker = {
  name: 'kit-inline-worker',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('/tools/bpm-key/BpmKey.tsx')) return
    const call = "new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })"
    if (!code.includes(call)) this.error('BpmKey.tsx no longer starts its worker as expected')
    return `import AnalysisWorker from './worker.ts?worker&inline'\n${code.replace(call, 'new AnalysisWorker()')}`
  },
}

/** Names exported by a tool's public types, values and types apart. */
function apiNames(tool) {
  const file = join(PACKAGES, tool, 'types/index.d.ts')
  const values = []
  const types = []
  if (!existsSync(file)) return { values, types }
  for (const [, kind, name] of read(file).matchAll(NAME)) (kind === 'type' || kind === 'interface' ? types : values).push(name)
  return { values, types }
}

/** npm packages that end up in the bundle, to check the notices cover them. */
function collectPackages(found) {
  return {
    name: 'kit-collect-packages',
    load(id) {
      const m = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)
      if (m) found.add(m[1])
    },
  }
}

async function buildKit(id) {
  if (ENVATO && !ENVATO_KITS.includes(id)) throw new Error(`${id} is not sold on ${STORE.name}`)
  const kit = await getKit(id)
  const name = `toowl-${id}-${VERSION}`
  const work = join(WORK, id)
  const stage = join(OUT, 'stage', name)
  rmSync(work, { recursive: true, force: true })
  rmSync(stage, { recursive: true, force: true })
  mkdirSync(join(work, 'elements'), { recursive: true })
  mkdirSync(join(work, 'api'), { recursive: true })

  // Entry files: one element and one headless API per tool, plus all-in-one entries.
  const entries = { all: join(work, 'all.ts') }
  const seen = new Set()
  const index = []
  for (const tool of kit.tools) {
    writeFileSync(join(work, 'elements', `${tool}.ts`), `export * from '${join(PACKAGES, tool, 'src/element')}'\n`)
    entries[`elements/${tool}`] = join(work, 'elements', `${tool}.ts`)
    if (hasApi(tool)) {
      writeFileSync(join(work, 'api', `${tool}.ts`), `export * from '${join(PACKAGES, tool, 'src/index')}'\n`)
      entries[tool] = join(work, 'api', `${tool}.ts`)
      const { values, types } = apiNames(tool)
      const fresh = [...values.filter((n) => !seen.has(n)), ...types.filter((n) => !seen.has(n)).map((n) => `type ${n}`)]
      ;[...values, ...types].forEach((n) => seen.add(n))
      if (fresh.length) index.push(`export { ${fresh.join(', ')} } from '${join(PACKAGES, tool, 'src/index')}'`)
    }
  }
  writeFileSync(join(work, 'all.ts'), kit.tools.map((t) => `export * from './elements/${t}'`).join('\n') + '\n')
  if (index.length) {
    writeFileSync(join(work, 'index.ts'), index.join('\n') + '\n')
    entries.index = join(work, 'index.ts')
  }

  const bundled = new Set()
  await build({
    configFile: false,
    root: work,
    logLevel: 'warn',
    plugins: [inlineWorker, react(), tailwindcss(), collectPackages(bundled)],
    resolve: { alias: { '@': join(ROOT, 'src') } },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'import.meta.env.BASE_URL': JSON.stringify('https://toowl.my.id/'),
    },
    // An app build, not lib mode: lib mode inlines every asset (WebAssembly,
    // models) as base64 inside JS, which a self-hosted kit doesn't need. With
    // base './' Vite points at them through import.meta.url, so dist/ works
    // from any folder or CDN as long as it stays together.
    base: './',
    build: {
      outDir: join(stage, 'dist'),
      emptyOutDir: true,
      reportCompressedSize: false,
      // Marketplaces ask for readable, editable code: no minifying there.
      minify: !ENVATO,
      copyPublicDir: false,
      modulePreload: false,
      rollupOptions: {
        input: entries,
        preserveEntrySignatures: 'exports-only',
        output: {
          format: 'es',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  })

  // Types: the packages' hand-written public types (guarded by their types/check.ts).
  const dist = join(stage, 'dist')
  mkdirSync(join(dist, 'types'), { recursive: true })
  const dts = ['// Headless API: plain async functions, browser only (File, Blob, canvas, WebAssembly).', '']
  const done = new Set()
  for (const tool of kit.tools) {
    cpSync(join(PACKAGES, tool, 'types/element.d.ts'), join(dist, 'elements', `${tool}.d.ts`))
    if (!hasApi(tool)) continue
    cpSync(join(PACKAGES, tool, 'types/index.d.ts'), join(dist, 'types', `${tool}.d.ts`))
    writeFileSync(join(dist, `${tool}.d.ts`), `export * from './types/${tool}'\n`)
    const { values, types } = apiNames(tool)
    const fresh = [...values.filter((n) => !done.has(n)), ...types.filter((n) => !done.has(n)).map((n) => `type ${n}`)]
    ;[...values, ...types].forEach((n) => done.add(n))
    if (fresh.length) dts.push(`export { ${fresh.join(', ')} } from './types/${tool}'`)
  }
  if (index.length) writeFileSync(join(dist, 'index.d.ts'), dts.join('\n') + '\n')
  writeFileSync(join(dist, 'all.d.ts'), kit.tools.map((t) => `export * from './elements/${t}'`).join('\n') + '\n')

  // Docs, license, examples.
  const rows = kit.tools.map((t) => ({ tool: t, tag: tagOf(t), desc: pkg(t).description, api: hasApi(t) }))
  const title = kit.single ? `${rows[0].tag} component` : kit.title
  const vars = {
    TITLE: title,
    ZIP: name,
    VERSION,
    TAGLINE: kit.single ? rows[0].desc : kit.tagline,
    COUNT: String(rows.length),
    FIRST_TAG: rows[0].tag,
    FIRST_TOOL: rows[0].tool,
    TOOL_TABLE: rows
      .map((r) => `| \`<${r.tag}>\` | ${r.desc.replace(/\|/g, '\\|')} | \`dist/elements/${r.tool}.js\` | ${r.api ? `\`dist/${r.tool}.js\`` : '(element only)'} |`)
      .join('\n'),
    TOOLS_JSON: JSON.stringify(Object.fromEntries(rows.map((r) => [r.tag, r.tool]))),
    LIVE: ENVATO
      ? `${PREVIEW_URL}?kit=${id}`
      : rows.map((r) => `- \`<${r.tag}>\`: https://toowl.my.id/en/${r.tool}/`).join('\n'),
    SOURCE_NOTE: ENVATO
      ? '\n## Source code\n\n`dist/` is built without minifying, so it stays readable and editable. The\noriginal TypeScript/React source of each tool is in `source/tools/<tool>/`\n(its UI and logic) and `source/packages/<tool>/` (the custom element and the\nheadless API entry). Shared UI parts (buttons, file drop, theme) are bundled\nin `dist/chunks/`.\n'
      : '',
    LICENSE_SHORT: ENVATO ? STORE.license : 'commercial license',
    LICENSE_SUMMARY: ENVATO
      ? `Sold on ${STORE.name} under the ${STORE.license}: see \`LICENSE.md\`. In short,\n${STORE.small}. Don't redistribute or resell the kit itself. The bundled\nopen-source libraries keep their own licenses (\`THIRD-PARTY-NOTICES.md\`, \`licenses/\`).`
      : "Commercial license: see `LICENSE.md`. In short, use it in unlimited projects\nof your own or your clients', closed source, with no AGPL obligations; don't\nresell the kit itself. The bundled open-source libraries keep their own\nlicenses (`THIRD-PARTY-NOTICES.md`, `licenses/`).",
    API_LINE: rows.every((r) => r.api)
      ? '- **A headless API**: plain async functions, so you can build your own UI.'
      : rows.some((r) => r.api)
        ? '- **A headless API** where the table below lists one: plain functions, so you can\n  build your own UI. The others ship as elements only.'
        : '- No headless API in this kit: every component ships as an element.',
    SUPPORT: ENVATO
      ? `Updates are free: download the latest version from your ${STORE.downloads} any time. Questions or bugs: use ${STORE.support}.`
      : 'Updates are free: download the latest ZIP from your Gumroad library any time.\nQuestions or bugs: reply to your Gumroad receipt email.',
  }
  const fill = (text) => text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`template: no value for {{${k}}}`)
    return vars[k]
  })
  for (const file of ['README.md', 'LICENSE.md', 'CHANGELOG.md', 'examples/html/index.html', 'examples/react/package.json', 'examples/react/index.html', 'examples/react/src/main.tsx', 'examples/react/src/App.tsx', 'examples/react/vite.config.ts', 'examples/react/README.md']) {
    mkdirSync(dirname(join(stage, file)), { recursive: true })
    writeFileSync(join(stage, file), fill(read(templateFile(file))))
  }
  const notice = notices(kit.tools, bundled)
  writeFileSync(join(stage, 'THIRD-PARTY-NOTICES.md'), notice)
  // Every bundled npm package must be named in the notices (helpers that only
  // ship inside another package's own bundle are listed with that package).
  const text = notice.toLowerCase().replace('react dom', 'react-dom')
  const missing = [...bundled].filter((p) => !text.includes(p.replace(/^@[^/]+\//, '').toLowerCase()) && !text.includes(p.toLowerCase()))
  if (missing.length) console.warn(`  ${id}: not in notices: ${missing.join(', ')}`)
  cpSync(join(TEMPLATE, 'licenses'), join(stage, 'licenses'), { recursive: true })
  // Kit-specific extras (e.g. a headless example) on top of the common files.
  if (existsSync(join(TEMPLATE, 'extras', id))) cpSync(join(TEMPLATE, 'extras', id), stage, { recursive: true })

  // Marketplaces: the tools' original TypeScript/React source next to the build.
  if (ENVATO) for (const tool of kit.tools) {
    const ui = join(ROOT, 'src/tools', tool)
    const code = (f) => !/\.(onnx|wasm|bin)$/.test(f) // models and wasm are in dist/ already
    if (existsSync(ui)) cpSync(ui, join(stage, 'source', 'tools', tool), { recursive: true, filter: code })
    cpSync(join(PACKAGES, tool, 'src'), join(stage, 'source', 'packages', tool), { recursive: true })
  }
  if (ENVATO) writeDocs(join(stage, 'documentation'), title, read(join(stage, 'README.md')), notice)

  const zip = join(OUT, `${name}.zip`)
  rmSync(zip, { force: true })
  execFileSync('zip', ['-qr', '-X', zip, name], { cwd: join(OUT, 'stage') })
  const size = (readFileSync(zip).length / 1e6).toFixed(1)
  console.log(`${id}: ${rows.length} tools → ${zip} (${size} MB)`)
}

/** Rows the packages' own notices lack, by the npm packages that bring them in. */
const EXTRA_ROWS = {
  'onnxruntime-web': [
    '| ONNX Runtime Web (onnxruntime-web, with its WebAssembly) | MIT | https://github.com/microsoft/onnxruntime |',
    '| U²-Net-P model (u2netp.onnx) | Apache-2.0 | https://github.com/xuebinqin/U-2-Net |',
  ],
  '@capacitor/core': [
    '| Capacitor core and plugins (@capacitor/core, app, filesystem, share, synapse), chunks that load only inside a Capacitor app | MIT | https://github.com/ionic-team/capacitor-plugins |',
  ],
  scheduler: ['| scheduler (part of React) | MIT | https://github.com/facebook/react |'],
  'performance-now': ['| performance-now, raf (bundled by canvg, an optional jsPDF chunk) | MIT | https://github.com/braveg1rl/performance-now |'],
  'fast-png': ['| fast-png, iobuffer (bundled by jsPDF) | MIT | https://github.com/image-js/fast-png, https://github.com/image-js/iobuffer |'],
}

/** One table of every bundled library, from the tools' own notices. */
function notices(tools, bundled = new Set()) {
  const rows = new Set()
  for (const [pkg, extra] of Object.entries(EXTRA_ROWS)) if (bundled.has(pkg) || (pkg === '@capacitor/core' && [...bundled].some((b) => b.startsWith('@capacitor/')))) extra.forEach((r) => rows.add(r))
  for (const tool of tools)
    for (const line of read(join(PACKAGES, tool, 'THIRD-PARTY-NOTICES.md')).split('\n'))
      if (line.startsWith('| ') && !line.startsWith('| Package') && !line.startsWith('| ---')) rows.add(line)
  return [
    '# Third-party notices',
    '',
    'The files in `dist/` bundle the following open-source software, unmodified. Their',
    'license texts are in `licenses/`. Those licenses cover those components; the',
    "kit's own code is covered by `LICENSE.md`.",
    '',
    '| Package | License | Source |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

/** documentation/index.html: the README as one offline HTML page (marketplaces ask for HTML or PDF help files). */
function writeDocs(dir, title, readme, notice) {
  mkdirSync(dir, { recursive: true })
  const body = marked.parse(readme)
  const toc = [...readme.matchAll(/^## (.+)$/gm)].map(([, h]) => `<li><a href="#${slug(h)}">${esc(h)}</a></li>`).join('')
  const withIds = body.replace(/<h2>(.+?)<\/h2>/g, (_, h) => `<h2 id="${slug(h.replace(/<[^>]+>/g, ''))}">${h}</h2>`)
  writeFileSync(join(dir, 'index.html'), DOCS_PAGE(title, toc, withIds + marked.parse(notice.replace(/^# /m, '## '))))
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const slug = (s) => s.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const DOCS_PAGE = (title, toc, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}: documentation</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; margin: 0; color: #18181b; background: #fafafa; }
  .wrap { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 40px; max-width: 1180px; margin: auto; padding: 32px 24px 64px; }
  nav { position: sticky; top: 24px; align-self: start; font-size: 14px; }
  nav ol { padding-left: 18px; } nav a { color: #3f3f46; text-decoration: none; } nav a:hover { color: #15803d; }
  main { background: white; border: 1px solid #e4e4e7; border-radius: 14px; padding: 8px 40px 40px; }
  h1 { font-size: 30px; } h2 { margin-top: 40px; padding-top: 16px; border-top: 1px solid #f4f4f5; }
  code { font: 13px/1.5 ui-monospace, monospace; background: #f4f4f5; padding: 1px 5px; border-radius: 4px; }
  pre { background: #18181b; color: #f4f4f5; padding: 16px; border-radius: 10px; overflow: auto; }
  pre code { background: none; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; display: block; overflow-x: auto; }
  th, td { border: 1px solid #e4e4e7; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; }
  @media (max-width: 800px) { .wrap { grid-template-columns: 1fr; } nav { position: static; } main { padding: 8px 18px 24px; } }
</style>
</head>
<body>
<div class="wrap">
  <nav><strong>${esc(title)}</strong><ol>${toc}<li><a href="#third-party-notices">Third-party notices</a></li></ol></nav>
  <main>${body.replace('<h2>Third-party notices</h2>', '<h2 id="third-party-notices">Third-party notices</h2>')}</main>
</div>
</body>
</html>
`

/** The CodeCanyon live preview: the complete kit's dist/ once, one demo page that shows any kit (?kit=). */
async function buildPreview(target) {
  await buildKit('complete')
  const stage = join(OUT, 'stage', `toowl-complete-${VERSION}`)
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(join(stage, 'dist'), join(target, 'dist'), { recursive: true })
  const all = await getKit('complete')
  const kits = { complete: { title: 'Complete Kit', tagline: all.tagline, items: all.tools.map((t) => [tagOf(t), t, pkg(t).description]) } }
  for (const [id, k] of Object.entries(KITS)) if (ENVATO_KITS.includes(id)) kits[id] = { title: k.title, tagline: k.tagline, buy: CODESTER[id], items: k.tools.map((t) => [tagOf(t), t, pkg(t).description]) }
  const logo = read(join(ROOT, 'src', 'components', 'Logo.tsx')).match(/const MARK =\s*'([^']+)'/)[1]
  mkdirSync(join(target, 'fonts'))
  for (const font of ['geist-latin.woff2', 'geist-mono-latin.woff2']) cpSync(join(ROOT, 'src', 'assets', 'fonts', font), join(target, 'fonts', font))
  writeFileSync(join(target, 'index.html'), read(join(TEMPLATE, 'envato', 'preview.html')).replace('{{KITS_JSON}}', () => JSON.stringify(kits)).replace('{{LOGO_PATH}}', logo))
  console.log(`preview → ${target}`)
}

const preview = flag('preview')
const arg = ARGS.find((a) => !a.startsWith('--'))
if (!arg && !preview) {
  console.error('usage: node packages/_kits/build.mjs <kit|all> [--market=envato] | --preview=<dir>')
  process.exit(1)
}
if (preview) {
  if (!ENVATO) throw new Error('--preview is for a marketplace build')
  await buildPreview(join(ROOT, preview))
} else for (const id of arg === 'all' ? (ENVATO ? ENVATO_KITS : ALL_KITS()) : arg.split(',')) await buildKit(id)
rmSync(WORK, { recursive: true, force: true })
