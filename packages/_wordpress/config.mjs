// The WordPress plugin: which tools go in, which are free, the version and
// what readme.txt says about WordPress versions.
// `node packages/_wordpress/build.mjs` reads this.
//
// Three ZIPs come out of one source (all three include the image optimizer):
//   toowl-image-optimizer (WordPress.org): only the upload optimizer.
//   toowl      (free, for WordPress.org): FREE tools only, no license code at all
//              (WordPress.org forbids trialware: locked features in a free plugin).
//   toowl-pro  (sold): every tool in TOOLS. FREE ones always work; the rest open
//              with a license key, and the key's product decides which (single
//              tool, theme pack, all) — the same Gumroad products as the embed
//              license in src/lib/license.ts.

import { existsSync, readdirSync } from 'node:fs'

export const VERSION = '1.0.0'

/** WordPress versions for readme.txt; bump "tested" after trying a new WordPress release. */
export const REQUIRES_WP = '6.5'
export const TESTED_UP_TO = '6.8'

/** The WordPress.org username(s) for readme.txt "Contributors". */
export const CONTRIBUTORS = 'chalidade'

/** Every tool that has a package (packages/<tool>/package.json). */
export const TOOLS = readdirSync(new URL('..', import.meta.url))
  .filter((d) => !d.startsWith('_') && existsSync(new URL(`../${d}/package.json`, import.meta.url)))
  .sort()

/**
 * Free in every edition with tools; the only tools in the WordPress.org ZIP.
 * Light everyday tools (no big WebAssembly), so the free plugin stays small
 * and the heavy PDF/Office/media/AI tools are what Pro sells.
 */
export const FREE = [
  'qr-generator', 'jadwal-sholat', 'hijriah', 'arah-kiblat', 'word-counter',
  'password-generator', 'unit-converter', 'persen', 'terbilang', 'color-picker',
]
