// Builds the WordPress plugin ZIPs from the site's own tool source.
//
//   node packages/_wordpress/build.mjs            both editions
//   node packages/_wordpress/build.mjs free       toowl (WordPress.org)
//   node packages/_wordpress/build.mjs pro        toowl-pro (sold)
//
// Output: packages/_wordpress/out/<slug>-<version>.zip, a folder <slug>/ holding
//   toowl.php, includes/, blocks/tool/   the PHP plugin (from plugin/)
//   assets/dist/elements/<tool>.js       each tool's custom element, plus chunks/ and
//                                        assets/ (wasm), loaded from the plugin folder
//   assets/tools.json                    tag, titles, descriptions, free or not
//   assets/products.json (Pro)           Gumroad products and the tools each opens
//   readme.txt, LICENSE.txt (GPL-2.0-or-later), THIRD-PARTY-NOTICES.md
//
// Which tools go in, and which are free: config.mjs. Product scopes come from
// LICENSE.gumroad in src/lib/license.ts, resolved against the registry, so a
// key opens the same tools in WordPress as in an embed.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, createServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { FREE, TOOLS, VERSION } from './config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGES = join(HERE, '..')
const ROOT = join(PACKAGES, '..')
const OUT = join(HERE, 'out')
const WORK = join(HERE, '.work')
const read = (p) => readFileSync(p, 'utf8')

const EDITIONS = {
  free: {
    slug: 'toowl',
    other: 'toowl-pro',
    name: 'toowl – Browser Tools',
    tools: FREE,
    description: 'Browser-only tools as blocks and shortcodes: files never leave the visitor\'s device.',
    text: '**toowl Pro** adds PDF, image, Office, video and audio tools, opened with a license key for one tool, a theme pack or all tools: https://toowl.my.id/embed/',
    external: 'This plugin connects to no external service. The tools run in the visitor\'s browser from files in this plugin\'s folder.',
  },
  pro: {
    slug: 'toowl-pro',
    other: 'toowl',
    name: 'toowl Pro – Browser Tools',
    tools: TOOLS,
    description: 'Browser-only tools as blocks and shortcodes: files never leave the visitor\'s device. A license key opens the paid tools.',
    text: 'The free tools always work. The others open with a license key from https://toowl.my.id/embed/: one tool, a theme pack, or all tools. Enter it in Settings → toowl.',
    external: 'To check a license key, this plugin sends the key and a toowl product id to Gumroad (https://api.gumroad.com/v2/licenses/verify), from your server, when you save the key and once a week after. Nothing about your visitors is sent. Gumroad terms: https://gumroad.com/terms, privacy: https://gumroad.com/privacy',
  },
}

for (const t of FREE) if (!TOOLS.includes(t)) throw new Error(`config: free tool ${t} is not in TOOLS`)

/** Registry, English text and license products, read from the site's TypeScript. */
async function siteData() {
  const server = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: 'error',
    resolve: { alias: { '@': join(ROOT, 'src') } },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const { TOOLS: registry } = await server.ssrLoadModule('/src/tools/registry.ts')
    const { TOOLS_EN } = await server.ssrLoadModule('/src/tools/registry-en.ts')
    const { LICENSE } = await server.ssrLoadModule('/src/lib/license.ts')
    return { registry, TOOLS_EN, LICENSE }
  } finally {
    await server.close()
    // createServer() set NODE_ENV to development; left so, the React plugin
    // compiles JSX for React's dev runtime (jsxDEV), which the bundle lacks.
    process.env.NODE_ENV = 'production'
  }
}

const tagOf = (tool) => {
  const src = read(join(PACKAGES, tool, 'src/element.tsx'))
  const m = src.match(/tag: '([a-z0-9-]+)'/) ?? src.match(/customElements\.define\('([a-z0-9-]+)'/)
  if (!m) throw new Error(`${tool}: no element tag found`)
  return m[1]
}

/** bpm-key starts its worker from a URL; inline it as the kits do. */
const inlineWorker = {
  name: 'wp-inline-worker',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('/tools/bpm-key/BpmKey.tsx')) return
    const call = "new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })"
    if (!code.includes(call)) this.error('BpmKey.tsx no longer starts its worker as expected')
    return `import AnalysisWorker from './worker.ts?worker&inline'\n${code.replace(call, 'new AnalysisWorker()')}`
  },
}

/** Each tool's element as an ES module, sharing chunks; wasm and models as files next to them. */
async function buildElements(tools, outDir) {
  const work = join(WORK, 'entries')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })
  const input = {}
  for (const tool of tools) {
    if (!existsSync(join(PACKAGES, tool, 'src/element.tsx'))) throw new Error(`${tool}: no package (packages/${tool}/src/element.tsx)`)
    // Re-exported, not a bare import: the packages declare their src/ free of side
    // effects, so a bare import would be tree-shaken to an empty file.
    writeFileSync(join(work, `${tool}.ts`), `export * from '${join(PACKAGES, tool, 'src/element')}'\n`)
    input[`elements/${tool}`] = join(work, `${tool}.ts`)
  }
  await build({
    configFile: false,
    mode: 'production',
    root: work,
    logLevel: 'warn',
    plugins: [inlineWorker, react(), tailwindcss()],
    resolve: { alias: { '@': join(ROOT, 'src') } },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      // Links inside a tool point at toowl.my.id, not at the WordPress site.
      'import.meta.env.BASE_URL': JSON.stringify('https://toowl.my.id/'),
    },
    // App build with base './', like the kits: assets are files found through
    // import.meta.url, so the folder works wherever WordPress serves it from.
    base: './',
    build: {
      outDir,
      emptyOutDir: true,
      reportCompressedSize: false,
      copyPublicDir: false,
      modulePreload: false,
      rollupOptions: {
        input,
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
}

/** "Licensed under X" table of every bundled library, from the tools' own notices. */
function notices(tools) {
  const rows = new Set()
  for (const tool of tools)
    for (const line of read(join(PACKAGES, tool, 'THIRD-PARTY-NOTICES.md')).split('\n'))
      if (line.startsWith('| ') && !line.startsWith('| Package') && !line.startsWith('| ---')) rows.add(line)
  return [
    '# Third-party notices',
    '',
    '`assets/dist/` bundles the following open-source software, unmodified. All of',
    'it is under licenses compatible with the GPL; the full texts are in each',
    "project's repository. The plugin's own code is GPL-2.0-or-later (`LICENSE.txt`).",
    '',
    '| Package | License | Source |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

/** Does a license.ts scope cover this registry tool? (same rule as inScope there) */
function inScope(scope, tool) {
  if (scope === 'all') return true
  if (scope === 'one') return false
  return !!(scope.categories?.includes(tool.category) || scope.tools?.includes(tool.slug))
}

function filesIn(dir) {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? filesIn(join(dir, f)) : [join(dir, f)]))
}

async function buildEdition(id, site) {
  const ed = EDITIONS[id]
  const stage = join(OUT, 'stage', ed.slug)
  rmSync(stage, { recursive: true, force: true })
  mkdirSync(stage, { recursive: true })

  // PHP, block and readme, with placeholders filled.
  cpSync(join(HERE, 'plugin'), stage, { recursive: true, filter: (f) => id === 'pro' || !f.endsWith('license.php') })
  const byslug = Object.fromEntries(site.registry.map((t) => [t.slug, t]))
  const rows = ed.tools.map((slug) => {
    const r = byslug[slug]
    if (!r) throw new Error(`${slug}: not in the registry`)
    const en = site.TOOLS_EN[slug] ?? {}
    return {
      slug,
      tag: tagOf(slug),
      category: r.category,
      title: { id: r.title, en: en.title ?? r.title },
      description: { id: r.description, en: en.description ?? r.description },
      free: FREE.includes(slug),
    }
  })
  const vars = {
    PLUGIN_NAME: ed.name,
    PLUGIN_DESCRIPTION: ed.description,
    SHORT_DESCRIPTION: ed.description,
    VERSION,
    EDITION: id,
    OTHER_SLUG: ed.other,
    FIRST_TOOL: rows[0].slug,
    TOOL_COUNT: String(rows.length),
    TOOL_LIST: rows.map((r) => `* **${r.title.en}**${id === 'pro' && r.free ? ' (free)' : ''}: ${r.description.en}`).join('\n'),
    EDITION_TEXT: ed.text,
    EXTERNAL: ed.external,
  }
  for (const file of filesIn(stage).filter((f) => /\.(php|txt|json)$/.test(f) && !f.endsWith('LICENSE.txt'))) {
    const text = read(file).replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!(k in vars)) throw new Error(`${relative(stage, file)}: no value for {{${k}}}`)
      return vars[k]
    })
    writeFileSync(file, text)
  }

  writeFileSync(join(stage, 'assets', 'tools.json'), JSON.stringify(Object.fromEntries(rows.map(({ slug, ...r }) => [slug, r])), null, 1) + '\n')

  if (id === 'pro') {
    // Each Gumroad product, with the tools of this plugin it opens. 'one' = the
    // checkout variant "[slug]" picks the tool; 'all' = everything.
    const paid = rows.filter((r) => !r.free)
    const products = site.LICENSE.gumroad
      .filter((p) => p.id && p.url)
      .map((p) => ({
        id: p.id,
        url: p.url,
        price: p.price,
        name: { id: p.name[0], en: p.name[1] },
        scope: typeof p.scope === 'string' ? p.scope : rows.filter((r) => inScope(p.scope, { slug: r.slug, category: r.category })).map((r) => r.slug),
      }))
      // A pack that opens none of this plugin's paid tools isn't worth listing.
      .filter((p) => typeof p.scope === 'string' || p.scope.some((s) => paid.some((r) => r.slug === s)))
    writeFileSync(join(stage, 'assets', 'products.json'), JSON.stringify(products, null, 1) + '\n')
  }

  await buildElements(ed.tools, join(stage, 'assets', 'dist'))
  writeFileSync(join(stage, 'THIRD-PARTY-NOTICES.md'), notices(ed.tools))

  mkdirSync(OUT, { recursive: true })
  const zip = join(OUT, `${ed.slug}-${VERSION}.zip`)
  rmSync(zip, { force: true })
  execFileSync('zip', ['-qr', '-X', zip, ed.slug], { cwd: join(OUT, 'stage') })
  console.log(`${ed.slug}: ${rows.length} tools → ${relative(ROOT, zip)} (${(readFileSync(zip).length / 1e6).toFixed(1)} MB)`)
}

const arg = process.argv[2]
const which = arg ? [arg] : Object.keys(EDITIONS)
for (const id of which) if (!EDITIONS[id]) throw new Error(`unknown edition ${id} (free or pro)`)
const site = await siteData()
for (const id of which) await buildEdition(id, site)
rmSync(WORK, { recursive: true, force: true })
