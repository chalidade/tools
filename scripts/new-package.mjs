// Scaffold packages/<name>/ for a tool: the boilerplate that is the same for
// every package. index.ts, types/ and README.md are left for a human to fill in.
//
//   node scripts/new-package.mjs <name> <tool-dir> <element-tag> <Component> "<English description>"
//   node scripts/new-package.mjs uuid uuid uuid-generator Uuid "Generate UUID v4 / v7 …"
//
// Then: write src/index.ts, types/index.d.ts, types/check.ts and README.md,
// add the `package` field in src/tools/registry.ts, and `npm run build:packages`.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'

const [name, toolDir, tag, component, description] = process.argv.slice(2)
if (!description || !/^[a-z0-9-]+$/.test(name) || !/^[a-z]+-[a-z0-9-]+$/.test(tag)) {
  console.error('usage: node scripts/new-package.mjs <name> <tool-dir> <element-tag (needs a hyphen)> <Component> "<description>"')
  process.exit(1)
}
const dir = `packages/${name}`
if (existsSync(dir)) {
  console.error(`${dir} already exists`)
  process.exit(1)
}
if (!existsSync(`src/tools/${toolDir}/${component}.tsx`)) {
  console.error(`src/tools/${toolDir}/${component}.tsx not found`)
  process.exit(1)
}

mkdirSync(`${dir}/src`, { recursive: true })
mkdirSync(`${dir}/types`)
const write = (file, text) => writeFileSync(`${dir}/${file}`, text.replace(/^\n/, ''))
cpSync('packages/screen-recorder/LICENSE', `${dir}/LICENSE`)

write('package.json', JSON.stringify({
  name: `@chalidade/${name}`,
  version: '0.1.0',
  description,
  keywords: ['web component', 'custom element'],
  license: 'MIT',
  author: 'Chalid Ade Rahman',
  homepage: `https://chalidade.github.io/tools/#/${toolDir}`,
  repository: { type: 'git', url: 'git+https://github.com/chalidade/tools.git', directory: `packages/${name}` },
  bugs: 'https://github.com/chalidade/tools/issues',
  type: 'module',
  main: './dist/index.js',
  module: './dist/index.js',
  types: './dist/index.d.ts',
  jsdelivr: './dist/element.js',
  unpkg: './dist/element.js',
  exports: {
    '.': { types: './dist/index.d.ts', import: './dist/index.js' },
    './element': { types: './dist/element.d.ts', import: './dist/element.js' },
  },
  sideEffects: ['./dist/element.js'],
  files: ['dist', 'README.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md'],
  scripts: {
    build: 'tsc --noEmit -p . && vite build && cp types/*.d.ts dist/',
    prepublishOnly: 'npm run build',
  },
}, null, 2) + '\n')

write('tsconfig.json', `
{
  "extends": "../../tsconfig.app.json",
  "compilerOptions": {
    "tsBuildInfoFile": "../../node_modules/.tmp/tsconfig.${name}.tsbuildinfo",
    "paths": { "@/*": ["../../src/*"] }
  },
  "include": ["src", "../_shared", "types/index.d.ts", "types/check.ts", "../../src/vite-env.d.ts"]
}
`)

write('vite.config.ts', `
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Library build of the site's ${toolDir} tool. React is bundled, so a page
// needs nothing but one <script type="module">.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: { index: 'src/index.ts', element: 'src/element.tsx' },
      formats: ['es'],
    },
    rollupOptions: {
      output: { chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
})
`)

write('src/element.css', `
/* Styles for <${tag}>'s Shadow DOM: the shared base plus this tool's classes. */
@import "../../_shared/base.css";
@source "../../../src/tools/${toolDir}";
`)

write('src/element.tsx', `
// <${tag}> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/${name}@0/dist/element.js"></script>
//   <${tag}></${tag}>

import { defineToolElement } from '../../_shared/define-element'
import ${component} from '@/tools/${toolDir}/${component}'
import css from './element.css?inline'

export const ${component}Element = defineToolElement({ tag: '${tag}', css, render: () => <${component} /> })
`)

write('types/element.d.ts', `
/**
 * <${tag}> — importing this module registers the element.
 *
 * Attributes:
 * - \`theme\`: "auto" (default, follows the OS), "light" or "dark"
 * - \`lang\`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class ${component}Element extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    '${tag}': ${component}Element
  }
}
`)

write('THIRD-PARTY-NOTICES.md', `
# Third-party notices

The files in \`dist/\` bundle the following open-source software, unmodified.

| Package | License | Source |
| --- | --- | --- |
| React, React DOM | MIT | https://github.com/facebook/react |
| lucide-react | ISC | https://github.com/lucide-icons/lucide |
| Tailwind CSS (compiled styles) | MIT | https://github.com/tailwindlabs/tailwindcss |
| tw-animate-css | MIT | https://github.com/Wombosvideo/tw-animate-css |
| clsx | MIT | https://github.com/lukeed/clsx |
| tailwind-merge | MIT | https://github.com/dcastil/tailwind-merge |
| class-variance-authority | Apache-2.0 | https://github.com/joe-bell/cva |

The full license texts are in each project's repository.
`)

console.log(`created ${dir}/ — now write src/index.ts, types/index.d.ts, types/check.ts and README.md`)
