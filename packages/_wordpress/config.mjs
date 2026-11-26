// The WordPress plugin: which tools go in, which are free, and the version.
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

export const VERSION = '0.1.0'

/** Prototype: five tools. Later this becomes every package (see _kits/kits.mjs allTools). */
export const TOOLS = ['compress-pdf', 'merge-pdf', 'compress-image', 'qr-generator', 'jadwal-sholat']

/** Free in both editions; the only tools in the WordPress.org ZIP. */
export const FREE = ['qr-generator', 'jadwal-sholat']
