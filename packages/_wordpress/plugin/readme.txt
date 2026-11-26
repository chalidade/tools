=== {{PLUGIN_NAME}} ===
Contributors: chalidade
Tags: image optimization, compress images, pdf, qr code, prayer times
Requires at least: 6.5
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: {{VERSION}}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

{{SHORT_DESCRIPTION}}

== Description ==

toowl puts ready-made tools on your pages: add a block, or paste a shortcode. Every tool runs in your visitor's browser. Files they open in a tool are never uploaded, not to your server and not to anyone else, so your hosting does no work and nothing private leaves their device.

Tools in this plugin:

{{TOOL_LIST}}

**How to add a tool**

* Block editor: open the block inserter, search "toowl", pick the tool.
* Anywhere shortcodes work: `[toowl tool="{{FIRST_TOOL}}"]`. Options: `theme="auto|light|dark"`, `lang="en|id"` (default: your site language).

**Image optimizer included**

Images you upload (block editor, Media Library) are scaled down, re-encoded and stripped of GPS/camera data in your browser before they are sent, optionally as WebP; iPhone HEIC photos become JPEG. Images already in posts: "Compress with toowl" in the Image block toolbar. Settings → toowl.

Each tool is a web component in a Shadow DOM, so your theme's CSS can't break it. Its JavaScript and WebAssembly are served from this plugin's own folder: no CDN, no third-party requests.

{{EDITION_TEXT}}

**Source code**

The JavaScript in `assets/dist/` is built from https://github.com/chalidade/tools (the `src/tools/` folder and `packages/`), the same code as https://toowl.my.id/. Build it with `node packages/_wordpress/build.mjs`.

== External services ==

{{EXTERNAL}}

== Frequently Asked Questions ==

= Are files uploaded to my server? =

No. The tools read files with the browser's own APIs and write the result back as a download.

= Is there a "powered by" link? =

Only if you turn it on in Settings → toowl. It is off by default.

== Changelog ==

= {{VERSION}} =
* First release: {{TOOL_COUNT}} tools as blocks and shortcodes.
