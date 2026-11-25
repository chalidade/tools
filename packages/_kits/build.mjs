// Builds a developer kit ZIP for Gumroad.
//
//   node packages/_kits/build.mjs pdf-toolkit       one kit
//   node packages/_kits/build.mjs all               every kit and every single
//
// Output: packages/_kits/out/toowl-<kit>-<version>.zip, holding
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
import { ALL_KITS, VERSION, kit as getKit } from './kits.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGES = join(HERE, '..')
const ROOT = join(PACKAGES, '..')
const TEMPLATE = join(HERE, 'template')
const OUT = join(HERE, 'out')
const WORK = join(HERE, '.work')

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
    LIVE: rows.map((r) => `- \`<${r.tag}>\`: https://toowl.my.id/en/${r.tool}/`).join('\n'),
  }
  const fill = (text) => text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`template: no value for {{${k}}}`)
    return vars[k]
  })
  for (const file of ['README.md', 'LICENSE.md', 'CHANGELOG.md', 'examples/html/index.html', 'examples/react/package.json', 'examples/react/index.html', 'examples/react/src/main.tsx', 'examples/react/src/App.tsx', 'examples/react/vite.config.ts', 'examples/react/README.md']) {
    mkdirSync(dirname(join(stage, file)), { recursive: true })
    writeFileSync(join(stage, file), fill(read(join(TEMPLATE, file))))
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

const arg = process.argv[2]
if (!arg) {
  console.error('usage: node packages/_kits/build.mjs <kit|all>')
  process.exit(1)
}
for (const id of arg === 'all' ? ALL_KITS() : arg.split(',')) await buildKit(id)
rmSync(WORK, { recursive: true, force: true })
