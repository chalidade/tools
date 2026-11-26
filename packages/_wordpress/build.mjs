// Builds the WordPress plugin ZIPs from the site's own tool source.
//
//   node packages/_wordpress/build.mjs             every edition
//   node packages/_wordpress/build.mjs free        toowl (WordPress.org)
//   node packages/_wordpress/build.mjs pro         toowl-pro (sold)
//   node packages/_wordpress/build.mjs optimizer   toowl-image-optimizer (WordPress.org)
//
// Every edition has the image optimizer (admin/optimizer.js + the engine
// assets/dist/optimizer.js from src/optimizer.ts); the optimizer edition has
// nothing else. Editions are nested (optimizer ⊂ free ⊂ pro): the widest
// active one runs and switches the narrower ones off.
//
// Output: packages/_wordpress/out/<slug>-<version>.zip, a folder <slug>/ holding
//   toowl.php, includes/, blocks/tool/   the PHP plugin (from plugin/)
//   assets/dist/elements/<tool>.js       each tool's custom element, plus chunks/ and
//                                        assets/ (wasm), loaded from the plugin folder
//   assets/tools.json                    tag, titles, descriptions, free or not
//   assets/products.json (Pro)           Gumroad products and the tools each opens
//   readme.txt, LICENSE.txt (GPL-2.0-or-later), THIRD-PARTY-NOTICES.txt
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
import { CONTRIBUTORS, FREE, REQUIRES_WP, TESTED_UP_TO, TOOLS, VERSION } from './config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGES = join(HERE, '..')
const ROOT = join(PACKAGES, '..')
const OUT = join(HERE, 'out')
const WORK = join(HERE, '.work')
const read = (p) => readFileSync(p, 'utf8')

const EDITIONS = {
  optimizer: {
    slug: 'toowl-image-optimizer',
    uri: 'https://toowl.my.id/compress-image/',
    name: 'toowl Image Optimizer',
    tools: [],
    readme: 'readme-optimizer.txt',
    description: 'Compress, resize and convert images (JPEG, PNG, WebP, HEIC) in the browser before they are uploaded. No API, no quota; GPS data removed.',
    text: '',
    external: 'This plugin connects to no external service. Images are optimized in the uploader\'s browser with code from this plugin\'s folder.',
  },
  free: {
    slug: 'toowl',
    uri: 'https://toowl.my.id/embed/',
    name: 'toowl – Browser Tools',
    tools: FREE,
    description: 'Browser-only tools as blocks and shortcodes: files never leave the visitor\'s device.',
    readme: 'readme.txt',
    tags: 'qr code, prayer times, image optimization, password generator, tools',
    text: '**toowl Pro** adds PDF, image, Office, video and audio tools, opened with a license key for one tool, a theme pack or all tools: https://toowl.my.id/embed/',
    external: 'This plugin connects to no external service. The tools run in the visitor\'s browser from files in this plugin\'s folder.',
  },
  pro: {
    slug: 'toowl-pro',
    uri: 'https://toowl.my.id/embed/',
    name: 'toowl Pro – Browser Tools',
    tools: TOOLS,
    description: 'Browser-only tools as blocks and shortcodes: files never leave the visitor\'s device. A license key opens the paid tools.',
    readme: 'readme.txt',
    tags: 'pdf, compress images, remove background, qr code, tools',
    text: 'The free tools always work. The others open with a license key from https://toowl.my.id/embed/: one tool, a theme pack, or all tools. Enter it in Settings → toowl.',
    external: 'To check a license key, this plugin sends the key and a toowl product id to Gumroad (https://api.gumroad.com/v2/licenses/verify), from your server, when you save the key and once a week after. Nothing about your visitors is sent. Gumroad terms: https://gumroad.com/terms, privacy: https://gumroad.com/privacy',
  },
}

for (const t of FREE) if (!TOOLS.includes(t)) throw new Error(`config: free tool ${t} is not in TOOLS`)

/** Narrowest first: each edition contains the ones before it. */
const ORDER = ['optimizer', 'free', 'pro']
const mainFile = (id) => `${EDITIONS[id].slug}/toowl.php`
const phpList = (ids) => `array( ${ids.map((id) => `'${mainFile(id)}'`).join(', ')} )`

/**
 * WordPress.org wants each plugin's text domain to be its slug. The source
 * says 'toowl'; rewrite it in translation calls (PHP and JS) for other slugs.
 */
const I18N_FN = /\b(?:__|_e|_x|_n|_nx|esc_html__|esc_html_e|esc_html_x|esc_attr__|esc_attr_e|esc_attr_x|wp_set_script_translations)\(/g
function retextdomain(text, domain) {
  if (domain === 'toowl') return text
  let out = ''
  let from = 0
  for (const m of text.matchAll(I18N_FN)) {
    // Walk to the call's closing parenthesis, skipping strings; its last argument is the domain.
    let depth = 0
    let i = m.index + m[0].length - 1
    let quote = ''
    let lastComma = -1
    for (; i < text.length; i++) {
      const c = text[i]
      if (quote) {
        if (c === '\\') i++
        else if (c === quote) quote = ''
      } else if (c === "'" || c === '"' || c === '`') quote = c
      else if (c === '(') depth++
      else if (c === ')' && --depth === 0) break
      else if (c === ',' && depth === 1) lastComma = i
    }
    if (lastComma < 0 || i <= from) continue
    const arg = text.slice(lastComma + 1, i)
    if (arg.trim() !== "'toowl'") throw new Error(`text domain: unexpected ${text.slice(m.index, i + 1).slice(0, 120)}`)
    out += text.slice(from, lastComma + 1) + arg.replace("'toowl'", `'${domain}'`)
    from = i
  }
  return out + text.slice(from)
}

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
  const input = { optimizer: join(HERE, 'src/optimizer.ts') }
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
      // libheif (HEIC) is one ~2.4 MB chunk, loaded only for HEIC files.
      chunkSizeWarningLimit: 4000,
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

/**
 * readme.txt "Screenshots": one line per wporg/<slug>/screenshot-N.png, its
 * caption from screenshot-N.txt (WordPress.org shows the images from the
 * plugin's SVN assets/ folder, matched by number).
 */
function screenshotsSection(slug) {
  const dir = join(HERE, 'wporg', slug)
  if (!existsSync(dir)) return ''
  const shots = readdirSync(dir).filter((f) => /^screenshot-\d+\.txt$/.test(f)).sort((a, b) => parseInt(a.slice(11)) - parseInt(b.slice(11)))
  if (!shots.length) return ''
  return '== Screenshots ==\n\n' + shots.map((f, i) => `${i + 1}. ${read(join(dir, f)).trim()}`).join('\n') + '\n\n'
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
  const skip = (f) =>
    (id !== 'pro' && f.endsWith('license.php')) ||
    (!ed.tools.length && (f.includes('/blocks') || f.endsWith('/assets/toowl.css'))) ||
    (/readme[^/]*\.txt$/.test(f) && !f.endsWith(ed.readme))
  cpSync(join(HERE, 'plugin'), stage, { recursive: true, filter: (f) => !skip(f) })
  if (ed.readme !== 'readme.txt') execFileSync('mv', [join(stage, ed.readme), join(stage, 'readme.txt')])
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
    PLUGIN_URI: ed.uri,
    PLUGIN_DESCRIPTION: ed.description,
    SHORT_DESCRIPTION: ed.description,
    VERSION,
    REQUIRES_WP,
    TESTED_UP_TO,
    CONTRIBUTORS,
    TAGS: ed.tags ?? '',
    SCREENSHOTS: screenshotsSection(ed.slug),
    EDITION: id,
    TEXT_DOMAIN: ed.slug,
    WIDER_PLUGINS: phpList(ORDER.slice(ORDER.indexOf(id) + 1)),
    NARROWER_PLUGINS: phpList(ORDER.slice(0, ORDER.indexOf(id))),
    OTHER_PLUGINS: phpList(ORDER.filter((o) => o !== id)),
    FIRST_TOOL: rows[0]?.slug ?? '',
    TOOL_COUNT: String(rows.length),
    TOOL_LIST: rows.map((r) => `* **${r.title.en}**${id === 'pro' && r.free ? ' (free)' : ''}: ${r.description.en}`).join('\n'),
    EDITION_TEXT: ed.text,
    EXTERNAL: ed.external,
  }
  for (const file of filesIn(stage).filter((f) => /\.(php|txt|json|js)$/.test(f) && !f.endsWith('LICENSE.txt'))) {
    const text = retextdomain(read(file), ed.slug).replace(/\{\{(\w+)\}\}/g, (_, k) => {
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
  writeFileSync(join(stage, 'THIRD-PARTY-NOTICES.txt'), notices([...ed.tools, 'compress-image', 'convert-image']))

  mkdirSync(OUT, { recursive: true })
  const zip = join(OUT, `${ed.slug}-${VERSION}.zip`)
  rmSync(zip, { force: true })
  execFileSync('zip', ['-qr', '-X', zip, ed.slug], { cwd: join(OUT, 'stage') })
  console.log(`${ed.slug}: ${rows.length} tools → ${relative(ROOT, zip)} (${(readFileSync(zip).length / 1e6).toFixed(1)} MB)`)
}

const arg = process.argv[2]
const which = arg ? [arg] : Object.keys(EDITIONS)
for (const id of which) if (!EDITIONS[id]) throw new Error(`unknown edition ${id} (free or pro)`)
// The optimizer engine is TypeScript: type-check it before bundling.
execFileSync('npx', ['tsc', '--noEmit', '-p', HERE], { cwd: ROOT, stdio: 'inherit' })
const site = await siteData()
for (const id of which) await buildEdition(id, site)
rmSync(WORK, { recursive: true, force: true })
