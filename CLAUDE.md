# CLAUDE.md

Browser-only tools site, deployed to https://chalidade.github.io/tools/ by
`.github/workflows/pages.yml` on push to `main`. See README.md for the full
picture; the rules that matter when editing:

- **Everything runs client-side.** No backend, no uploads, no third-party
  processing APIs — the privacy promise on the homepage depends on it.
- **One tool = one folder** `src/tools/<slug>/` with a default-exported
  component, registered once in `src/tools/registry.ts` (lazy-loaded) with a
  `category` and search `keywords` (`src/tools/search.ts` matches word prefixes). Heavy
  libraries are dynamic `import()`s inside the tool, never top-level imports in
  shared code.
- Tool UIs reuse `src/components/tool/` (`FileDrop`, `ErrorNote`, `Segmented`, `PasswordInput`, `IconButton`, `CopyButton`, `SizeResult`/`ProgressCard`) and
  `downloadBlob`/`withExtension` from `src/lib/download.ts`.
  Tools that read a PDF's text layer share `src/lib/pdf-text.ts` (pdf.js
  loading, text pieces with position/size/bold/italic/font, grouped into lines
  and split into segments). Render PDF pages with `intent: 'print'` — the
  default display intent waits on requestAnimationFrame and stalls in a
  background tab.
- PDF writing/encryption goes through `src/lib/qpdf.ts` (qpdf 12 compiled to
  wasm): one fresh module instance per command, input at `/in`, output at
  `/out`. This build prints through console.log/error bound at creation, so
  `runQpdf` captures them to read messages like "invalid password". Use
  `encryptionInfo` (not `--requires-password`, which fails outright on
  password-protected files in qpdf 12).
- Editing existing PDFs (merge, split, watermark, sign) goes through
  `src/lib/pdf-doc.ts` (pdf-lib): `openPdfDoc` decrypts restriction-only PDFs
  with qpdf first and throws `LockedPdfError` for password-protected ones;
  `uprightPage` gives the page as shown (after /Rotate, crop box) and a
  matrix to draw in that space; `pageThumbs` renders previews with pdf.js.
- Image tools decode with `decodeImage` from `src/lib/image.ts` (EXIF
  rotation applied; SVG via <img>) and encode with `canvasBlob`.
- QR tools live together in `src/tools/qr/` (generator + reader share
  `payload.ts`). Reading uses zxing-wasm with `locateFile` pointed at the
  bundled `zxing_reader.wasm?url` — its default fetches the wasm from a CDN,
  which this site must not do.
- Audio/video goes through `src/lib/media.ts` (Mediabunny on WebCodecs):
  `probeMedia`, `convertMedia` (with optional `trim`), `sameContainer`,
  `AUDIO_OUTPUTS`, `videoThumbnails`/`audioPeaks`, and `ensureAudioEncoder`, which registers the
  wasm AAC/MP3 encoders only when the browser has no native one (MP3: never
  native; AAC: missing on Chrome/Linux and Firefox). Gate the UI on
  `hasWebCodecs()`. A cut, speed change, or merge re-encodes audio, so call
  `ensureAudioEncoder` first for MP3/AAC. Trim timelines use
  `src/components/tool/MediaRange.tsx` (`MediaRange`, `Filmstrip`, `Waveform`).
- Music tools (`guitar-tuner`, `metronome`, `chords`, `bpm-key`, `piano`, `guitar`, `drums`) use only the
  Web Audio API plus in-house DSP; shared note/frequency helpers and the
  Karplus–Strong `pluck()` live in `src/lib/music.ts`. Heavy analysis runs in a
  Web Worker (`bpm-key/worker.ts`); decoding stays on the main thread because
  workers have no `OfflineAudioContext`.
- **Daily update log:** each working day adds a dated entry to `CHANGELOG.md`
  (newest first, Indonesian). Planned tools live in `ROADMAP.md`, grouped by
  day — take the next day's batch from there and move it into the changelog
  when it ships.
- **Installable app (PWA):** `public/manifest.webmanifest` (relative URLs, so it
  works under `/tools/`), icons `icon-192/512/maskable-512.png`, and a service
  worker generated at build time from `pwa/sw.js` by the `serviceWorker()`
  plugin in `vite.config.ts` (it fills in the app-shell file list and a build
  version). Pages are network-first; hashed `/assets/` files are cache-first
  and cached on first use — never precache every tool. Registered in
  `main.tsx` for production only and never inside an embed. The header's
  `InstallButton` replays `beforeinstallprompt` (`src/lib/install.ts`) or shows
  the iOS "Add to Home Screen" steps. `ToolView` wraps each tool in
  `ToolBoundary`, so a chunk that cannot load (offline, stale tab after a
  deploy) shows a message instead of blanking the page.
- **Full screen:** `src/components/tool/Stage.tsx` (`useStage`, `Stage`,
  `StageButton`) — Fullscreen API plus a landscape orientation lock, falling
  back to a fixed overlay where element full screen does not exist (iPhone).
  Piano, guitar and drums put their playing surface in a `Stage`; in full
  screen they stretch it with `flex-1` and hide secondary controls.
- **Path routing for search engines** (`src/lib/route.ts`): `/tools/<slug>/`
  (Indonesian) and `/tools/en/<slug>/` (English); the address decides the
  language — never pick the language of an addressed page from the browser,
  or a crawler gets the wrong one. Link with `pageUrl(slug, lang)` as plain
  `<a href>` (intercepted for pushState); read query params with
  `routeQuery()`. Reloads work because `scripts/seo.mjs` (run by `npm run
  build` and CI after `vite build`) writes an `index.html` per page, plus
  `sitemap.xml` and `404.html`, using the text in `src/lib/seo.ts`; keep
  `seo.ts` the single source for titles/descriptions/about text. Old
  `#/<slug>` links are rewritten on load; embeds keep `#/<slug>?embed`.
  `robots.txt` lives in the `chalidade/chalidade.github.io` repo (domain
  root). A new tool needs nothing extra: its pages come from the registry.
- The home page is one search box (`SearchHome`): type, tap a result. It is
  built for a phone — results sit right under the box as compact rows, and
  the title folds away while typing. Its motion is CSS only (`blur-in`,
  `collapse-blur` in `src/theme.css`). The full catalogue — `Hero`,
  `ToolGrid` (search + category chips + cards, reads `?q=`) and
  `HowItWorks` — lives at `/all/` (Header → "All tools"); `scripts/seo.mjs`
  writes `all/index.html` with the home page's meta (canonical = home). No animation
  library and no per-frame JS on the home page — the walkable town that used
  to be here was removed to keep it fast; don't bring heavy visuals back.
- **Installable packages** live in `packages/<tool>/` (see packages/README.md):
  each builds the site's own tool source (alias `@` → `../../src`, never a
  copy) into an npm package with a custom element rendering the React UI in a
  Shadow DOM (`dist/element.js`, React + CSS bundled) and a headless API
  (`dist/index.js`). Design tokens live in `src/theme.css` under `:root, :host`
  so they reach shadow roots; Tailwind's `@property` rules are hoisted to the
  page head by `element.tsx`. Hand-written public types are guarded by
  `types/check.ts`. A tool with a package sets `package` in the registry; the
  tool page's "Pasang di situsmu" card (`InstallCard.tsx`) shows the script/npm
  snippets once `published: true`, and always offers the iframe embed —
  `#/<tool>?embed[&theme=light|dark]` renders the tool alone (any tool).
  `npm run build:packages` builds them; publishing is done by the owner.
- The repo is MIT-licensed (`LICENSE`).
- `App.tsx` only composes sections; each section lives in
  `src/components/<Section>.tsx`. Style with the semantic shadcn tokens in
  `src/index.css`, not hard-coded colors. Prefer plain CSS transitions; there is no animation
  library.
- **UI copy is bilingual — Indonesian and English** (`src/lib/i18n.ts`). Write
  both languages where the text is used: `const t = useT()` then
  `t('Teks Indonesia', 'English text')` in components; `tr(id, en)` in plain
  `.ts` code at the moment a message is built (never at module load, or the
  language freezes); `locale()` instead of a hard-coded `'id-ID'`. Module-level
  label lists store `[id, en]` pairs. A tool's title/description/formats in
  English go in `src/tools/registry-en.ts` (read via `toolText()` /
  `categoryText()`; search matches both languages). The header's ID/EN switch
  persists the choice; first visits get Indonesian only if the browser
  language is Indonesian/Malay — but only where the address names no language
  (hash embeds); `#/…?lang=en` forces a language there.
  Town text (keeper dialog, residents) lives in `playground/dialog.ts` and
  `residents.ts` per language. `setLang(x, { page: false })` is for the
  packages: it never touches the host page's `<html lang>` or storage.
- `npm run build` (tsc -b + vite build) is the correctness gate; there is no
  test runner.
- Design: Geist font, zinc neutrals, blue→violet brand gradient (`--brand-1`,
  `--brand-2`; utilities `text-gradient`, `bg-gradient-brand`, `bg-grid`,
  `bg-glow` in `src/index.css`), dark by default (`class="dark"` on `<html>`;
  a stored "light" choice from the Header toggle wins, applied by the
  pre-paint script in `index.html`). Public assets are referenced with
  `import.meta.env.BASE_URL` — the site is served under `/tools/`.
- Link preview: `public/og.png` is rendered from `og/og.html` by
  `npm run og`; meta tags live in `index.html` with absolute URLs.
