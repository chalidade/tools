# Architecture

A deeper look at how the site is put together. For the overview, see the [README](../README.md).

## Constraints that shape everything

1. **Client-side only.** No backend, no uploads, no third-party processing APIs. A feature that
   cannot work in the browser is not built (for example, a video downloader that would need a
   server-side proxy).
2. **Static hosting under a sub-path.** The site is plain files on GitHub Pages at `/tools/`. Public
   assets are referenced through `import.meta.env.BASE_URL`, and CI builds with `--base=/tools/`.
3. **Pay only for what you open.** 57 tools share one page, so nothing heavy may load until a tool
   needs it.

## App shell

- `src/App.tsx` only composes sections (`Header`, `Hero`, `ToolGrid`, `HowItWorks`,
  `ToolView`, `Footer`); each section is its own file in `src/components/`.
- **Routing** is `src/lib/route.ts`. Every page has a real address: `/tools/<slug>/` in
  Indonesian and `/tools/en/<slug>/` in English, and the address decides the language, so a
  crawler with an English browser still gets the Indonesian page it asked for. Same-site links
  are plain `<a href>` (crawlable, work without JS) and switch pages with `pushState`. Reloads
  don't 404 because the build writes an `index.html` into every page's folder (below). Old
  `#/<slug>` links are rewritten to the path on load; a visitor's stored ID/EN choice moves them
  to that language's address.
- **Search pages:** `scripts/seo.mjs` runs after `vite build` and writes, from the registry and
  `src/lib/seo.ts`, one page per tool and language with its own title, description, canonical,
  `hreflang`, Open Graph and JSON-LD, plus the page text (description, privacy points, related
  links) as static HTML inside `#root`; also `404.html` (noindex) and `sitemap.xml`. The app
  renders the same text (`ToolAbout`) and updates `<head>` after in-app navigation.
- **Embed mode:** `#/<slug>?embed` (the form already pasted on other sites) renders only
  `ToolView` for that tool, so any tool can sit in an iframe on another site. `theme` and `lang`
  can be forced from the URL.
- **Theme:** dark by default. A pre-paint script in `index.html` applies a stored light choice
  before React mounts, so there is no flash.

## The registry

`src/tools/registry.ts` is the single source of truth. Each entry has a slug, category, lucide
icon, Indonesian title/description/formats, search keywords and a `lazy(() => import(...))`
component; English text sits in `registry-en.ts`. From that list the app derives:

- the home-page grid, grouped by category, with counts per category
- search (`src/tools/search.ts`): accent-insensitive word-prefix matching across both languages,
  ranked title > keywords/formats > description, so "word" finds Word to PDF but not "password"
- the `/<slug>/` and `/en/<slug>/` pages, their search text and the sitemap
- the install/embed card on each tool page, and package metadata for tools that have one

## Shared engines (`src/lib/`)

| Module | Responsibility |
| --- | --- |
| `pdf-text.ts` | Loads pdf.js (legacy build) and its worker lazily; returns text pieces with position, size, bold/italic and font, grouped into lines and segments. Used by PDF to Word, Excel, PowerPoint and Markdown. |
| `pdf-doc.ts` | pdf-lib wrapper for editing existing PDFs. `openPdfDoc` decrypts restriction-only PDFs with qpdf first and raises a typed error for password-protected ones; `uprightPage` gives the page as displayed (after `/Rotate` and crop box) with a matrix to draw in that space; `pageThumbs` renders previews. |
| `qpdf.ts` | qpdf 12 compiled to WebAssembly (~1.3 MB, loaded on first use). One fresh module instance per command, input at `/in`, output at `/out` in its in-memory file system. The build prints through `console.log`/`console.error` captured at creation, so the wrapper redirects them to read messages such as "invalid password". |
| `media.ts` | Mediabunny on WebCodecs: probing, conversion with optional trim, thumbnails and waveform peaks. `ensureAudioEncoder` registers wasm MP3/AAC encoders only when no native encoder exists; `hasWebCodecs()` gates the UI. |
| `image.ts` | `decodeImage` (EXIF orientation applied, SVG via `<img>`) and `canvasBlob` for encoding. |
| `local-store.ts` | A small IndexedDB store for things kept on the device between visits (recordings, notes). |
| `i18n.ts` | Language state and helpers (below). |

Rendering note: PDF pages are rendered with `intent: 'print'`, because pdf.js's default display
intent waits on `requestAnimationFrame` and stalls when the tab is in the background.

Shared UI lives in `src/components/tool/` (`FileDrop`, `ErrorNote`, `Segmented`, `PasswordInput`,
`IconButton`, `CopyButton`, `SizeResult`/`ProgressCard`, and `MediaRange` with `Filmstrip` and
`Waveform` for trim timelines).

## WebAssembly and network hygiene

Every wasm binary is bundled by Vite (`?url` imports) and served from the site itself. zxing-wasm's
default fetches its `.wasm` from a CDN, so `locateFile` is pointed at the bundled file: a privacy
promise that depends on a third-party CDN being honest is not one.

## Untrusted file contents

Files are parsed in the page's origin, so their contents are treated as hostile input:

- Slide HTML produced from `.pptx` files is sanitised with DOMPurify before rendering.
- Notes render Markdown through marked and DOMPurify.
- The QR reader never opens links automatically and only makes `http(s)`, `mailto`, `tel` and `sms`
  clickable.
- Word to PDF disables docx-preview's rendering of embedded HTML parts (`altChunk`), which used an
  unsandboxed iframe, and strips hyperlinks that are not `http(s)`, `mailto` or in-document anchors
  (fixed in [68db1ae](https://github.com/chalidade/tools/commit/68db1ae)).

## Home page

Kept deliberately light: `Hero.tsx` is a short static intro, then `ToolGrid` (search, category
chips, cards) and `HowItWorks`. There is no animation library and no per-frame JavaScript; cards
use plain CSS transitions. An earlier walkable RPG town lived here and was removed because it
nearly doubled the main bundle and got in the way of simply finding a tool.

## Internationalisation

UI copy is written in both languages where it is used: `const t = useT()` then
`t('Teks Indonesia', 'English text')` in components, and `tr(id, en)` in plain `.ts` code at the
moment a message is built (never at module load, or the language would freeze). Dates and numbers
use `locale()`. The header's ID/EN switch persists the choice; a first visit gets Indonesian only if
the browser language is Indonesian or Malay; `?lang=` forces a language for embeds.
`setLang(x, { page: false })` lets the packages switch language without touching the host page's
`<html lang>` or storage.

## Packages (`packages/<tool>/`)

A package builds the site's own tool source (alias `@` → `../../src`), never a copy, into:

- `dist/element.js`: a custom element (for example `<screen-recorder>`) that renders the React UI
  inside a **Shadow DOM**, with React and CSS bundled, so one `<script type="module">` is enough and
  host-page CSS cannot leak in or out.
- `dist/index.js`: a headless API (for example `captureScreen()`) for developers who want their own UI.

Two Shadow DOM details: design tokens are declared on `:root, :host` in `src/theme.css` so they
reach shadow roots, and Tailwind's `@property` rules, which browsers ignore inside a shadow root,
are hoisted to the page `<head>` once by `element.tsx`. Public types are hand-written for
readability, and `types/check.ts` fails the build if they drift from the source.

`npm run build:packages` builds them. `@chalidade/screen-recorder` 0.1.0 is ready but not yet
published to npm; the tool page shows npm/script snippets only once a package is marked
`published` in the registry, and always offers the iframe.

## Build and deploy

- `npm run build` = `tsc -b && vite build`. The strict type-check is the correctness gate; there is
  no automated test runner.
- `.github/workflows/pages.yml` runs `npm ci`, the type-check and `vite build --base=/tools/` on Node
  22, then deploys `dist/` to GitHub Pages on every push to `main`.
- `public/og.png` (the link-preview card) is rendered from `og/og.html` by `npm run og`.
