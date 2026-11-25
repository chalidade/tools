# CLAUDE.md

Browser-only tools site, deployed to https://toowl.my.id/ by
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
- `image-to-svg` traces with VTracer from `vtracer-wasm` (MIT; wasm bundled
  via `?url`), one throwaway worker per trace (`trace.ts`). That build feeds
  VTracer's internal config: corner/splice thresholds are radians,
  `colorPrecision` is bits dropped (0–7; 8 panics), `filterSpeckle` is an
  area in px. A wasm panic poisons the instance, hence a fresh worker each
  time. Binary mode takes dark pixels as the shape, so `binarize` flattens
  alpha onto white first. Don't use potrace: it is GPL.
- RAW photo tools: `arw-to-jpg` develops RAW files with LibRaw from
  `libraw-wasm` (ISC wrapper, LibRaw LGPL-2.1/CDDL), one instance (its own
  worker) per file, disposed after. That build uses wasm threads; it works on
  this non-isolated page in Chromium, and where shared wasm memory cannot be
  created `raw.ts` falls back to the largest embedded baseline JPEG found by
  walking the TIFF IFDs. `image-to-dng` writes the DNG itself (`dng.ts`,
  `ljpeg.ts`, encoded in a worker): IFD0 is a small RGB preview, the SubIFD
  is LinearRaw, 16-bit linear sRGB in 256 px lossless-JPEG tiles (SOF3,
  predictor 1), ColorMatrix1 = XYZ→sRGB under D65, AsShotNeutral 1/1/1 and a
  linear ProfileToneCurve. Check output with rawpy/tifffile when changing it.
- A registry entry may carry `faq` (Indonesian; English in `TOOLS_EN`):
  shown under the tool by `ToolAbout`, in the static page, and as FAQPage
  JSON-LD — use it for searches the tool answers indirectly (e.g. "JPG ke
  ARW" lands on `image-to-dng`).
- `doc-to-pdf` renders with docx-preview, extended in `docx-extend.ts` by
  wrapping its internal parser's methods once (the prototype comes from
  parsing an empty package): floating pictures (wrapNone/behind) and framePr
  frames are tagged with a `toowl-place-N` class and placed against their page
  by `placeFloating` after an off-screen layout; groups/canvases/picture-filled
  shapes are parsed; "next page" section breaks get a page break. EMF/WMF are
  played back to SVG by `metafile.ts` (rtf.js players). Keep docx-preview on
  0.4.x unless those wrappers are re-checked.
- Document readers live together in `src/tools/reader/` (`pdf-reader`,
  `word-reader`, `excel-reader`, `ppt-reader`: one `Reader` shell, each page
  leads with its format but opens all four). They reuse the converters'
  readers — `renderDocx` (doc-to-pdf), `readSpreadsheet` (excel-to-pdf),
  `readPptx` (ppt-to-pdf) — so their sanitizing applies; PDF pages are pdf.js
  canvases plus its `TextLayer` (styles in `pdf-view.css`), drawn only near
  the view. Full screen uses `useStage({ landscape: false })` except the
  slide presenter.
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
- `denoise` runs one of two self-hosted models per channel at 48 kHz through
  `Denoiser` (`src/tools/denoise/rnnoise.ts`), which removes each model's
  latency so video keeps lip sync: DeepFilterNet 3 (`deepfilter.ts`, default,
  34 MB wasm with baked-in weights, `DF_DELAY` = 1440 measured) and RNNoise
  (110 KB, `keepHighs` restores the >6 kHz band it dulls). Re-measure the
  delay if either package is upgraded.
- CAD tools: `dwg-to-pdf` reads DWG/DXF with LibreDWG compiled to wasm
  (`@mlightcad/libredwg-web`, GPL-3.0; its glue finds the wasm through
  `new URL(…, import.meta.url)`, so Vite bundles it) and draws the
  `DwgDatabase` itself (`cad.ts` → shapes, `draw.ts` → canvas preview and
  jsPDF vector PDF) — the package's own `dwg_to_svg` gets extents and stroke
  widths wrong. Line weights are an index in DWG but 1/100 mm in DXF; DXF
  text is cleaned of AutoCAD 2018's "Embedded Object" MTEXT block before
  import. `pdf-to-dwg` walks pdf.js's operator list (`constructPath`) and
  writes an R12 DXF (`dxf.ts`); no browser library writes DWG reliably.
- `upscale-image` runs Real-ESRGAN `realesr-general-x4v3` (BSD-3) as ONNX
  (exported without PyTorch by `build-model.py`) on `onnxruntime-web/webgpu`,
  wasm path set to the bundled asyncify wasm; tiles with 12 px overlap.
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
- **Android app (Play Store):** a Trusted Web Activity built with Bubblewrap
  from `android/twa-manifest.json` (package `id.my.toowl`, same as the iOS
  bundle ID); only that file and `android/README.md` (the owner's build/sign/
  upload guide, Indonesian) are in git — the Gradle project, builds and the
  keystore are generated/ignored. The app trusts the site through
  `public/.well-known/assetlinks.json` (SHA-256 fingerprints filled in by the
  owner), which is why `pages.yml` uploads with `include-hidden-files: true` —
  without it the dot-folder is dropped and the app shows an address bar. The
  manifest's maskable and monochrome icons feed the Android launcher icon.
  `public/privacy/index.html` is a static bilingual privacy policy (store
  listings link to it); the footer links it with `rel="external"`, which
  `useLinkNavigation` leaves as a real page load.
  Tools marked `webOnly` in the registry (medical ones: cpr, p3k,
  kartu-medis, hpl) are left out of `TOOLS` inside the app (`isPlayApp()` in
  `src/lib/platform.ts`: TWA referrer, kept in sessionStorage), because Play
  requires an organization account for medical features.
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
  `public/robots.txt` and `public/CNAME` (custom domain toowl.my.id, served
  at the root, so `--base=/`) ship with the build. A new tool needs nothing extra: its pages come from the registry.
- The home page is one search box (`SearchHome`): type, pick a result. On a
  laptop it is a command palette in the middle of the page: `/` or ⌘/Ctrl-K
  focuses it, the arrow keys move through the rows and Enter opens the marked
  one; idle, it lists the tools this visitor opened last (`src/lib/recent.ts`,
  localStorage only) and the popular ones. On a phone the box is a dock fixed
  to the bottom, in thumb reach, with the lime button to `/all/`; the page
  above it shows tiles, rows and the category list, and while typing the title
  folds away and category chips appear over the dock. The dock sits at
  `bottom: var(--kb)`: `--kb` is the on-screen keyboard's height from
  `visualViewport` (iOS), and the viewport meta's
  `interactive-widget=resizes-content` covers Android — keep both. The full
  catalogue — `Hero`, `ToolGrid` (search + sticky category chips + compact
  cards, reads `?q=` and `?c=<category>`) and `HowItWorks` — lives at `/all/`
  (Header → "All tools"); `scripts/seo.mjs` writes `all/index.html` with the
  home page's meta (canonical = home). No animation library and no per-frame
  JS on the home page — the walkable town that used to be here was removed to
  keep it fast; don't bring heavy visuals back.
- **Tool pages** differ by screen. A phone gets an app bar from `Header`
  (`tool` prop): back, the tool's name, and a "⋯" menu holding All tools,
  language and theme — so the tool starts right under it, and its
  description sits in a card below. A laptop keeps the full header plus a
  breadcrumb (to `/all/?c=<category>`), icon and title above the tool. Both
  titles are `<h1>`; only one is displayed at a time.
- **Motion** is CSS only and lives in `src/theme.css`: `page-in` (a page
  arrives), `rise-in` (chips, menus, the toast; stagger with
  `animationDelay`), `fold` (the home title on a phone), `header-line` (the
  header's hairline appears on scroll, via a scroll timeline). Opacity and
  transform only, short, off under `prefers-reduced-motion`. Entrances fill
  `backwards`, never `forwards`/`both`: a finished transform animation that
  still fills acts like `will-change: transform` and would trap a tool's
  fixed overlay (`Stage` full screen on iPhone). The theme switch cross-fades
  with `document.startViewTransition` where it exists.
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
- **Analytics:** `src/lib/analytics.ts` loads the Cloudflare Web Analytics
  beacon (cookieless, `spa: true`) from `main.tsx`, only in production, only on
  host toowl.my.id (so never in the iOS bundle) and never in an embed. It is the
  one third-party script the site loads; it never sees file contents. Keep the
  "Statistik kunjungan" section of `public/privacy/index.html` and the Play
  Data safety form in step with what it sends.
- **Embed licenses:** `src/lib/license.ts` checks keys sold on Lemon Squeezy
  (UUID keys, `/v1/licenses/validate`, store/product ids must match) and
  Gumroad (`XXXXXXXX-…` keys, `/v2/licenses/verify` with `product_id`) straight
  from the browser — public endpoints, no secret key, result cached a week in
  localStorage. A valid `#/<slug>?embed&key=…` hides the credit line and honours
  `&accent=<hex>` (`applyAccent`). The `LICENSE` config starts empty; until a
  store is filled in, `licenseEnabled()` is false, the Install card's
  license panel stays hidden and `?key=` is ignored. It is a convenience gate,
  not DRM. Keep the privacy page's "Lisensi embed" section in step.
  Gumroad sells several products (`LICENSE.gumroad`): a Single Tool license
  (`scope: 'one'`, the tool is the checkout variant named `… [slug]`, offered for
  `SINGLE_TOOLS`), theme packs (`scope` = categories and/or slugs), All-Access
  and Agency (`'all'`). A key is verified against every product at once;
  `checkLicense(key, tool)` also checks the key covers that tool, and the
  Install card lists `productsFor(tool)`. Adding a tool to a pack's theme =
  its category is in the scope, or add its slug. Product images for Gumroad
  live on the `assets/gumroad` branch, not in the site.
- **Support link (Trakteer):** `SUPPORT_URL` in `src/components/SupportToast.tsx`
  is used by the footer and by a once-per-session toast shown after the first
  save (`downloadBlob` fires `tools:downloaded`). Plain links only — never
  Trakteer's embed `<script>`, which would break the no-third-party promise.
- The repo is AGPL-3.0-only (`LICENSE`), packages included; releases up to commit 43c1e4a (2026-11-19) were MIT. The owner also sells commercial licences, so keep every new dependency AGPL-compatible (MIT, BSD, Apache-2.0, GPL-3.0 are fine).
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
- Design ("Command"): near-black, one acid-lime accent, mono for small labels.
  Geist (sans + mono) is served from this site — `src/assets/fonts/*.woff2`,
  `@font-face` in `src/index.css`, the sans file preloaded in `index.html`;
  never from a font CDN. Tokens live in `src/theme.css`: `--brand-2` is the
  accent as text, borders and focus (lime in dark, a deep green in light,
  where lime on white is unreadable); `--brand-fill-1/2` is the lime fill
  (`bg-gradient-brand`, `bg-brand-fill`, same in both themes) and anything on
  it is `--brand-ink` (`text-brand-ink`) — never white. In dark, `--primary`
  is the lime too. Surfaces stay neutral: cards and rows use a bordered icon
  tile that turns lime on hover or when marked; the drop zone has one lime
  "Pilih file" button. `bg-dots` (a masked dot grid behind the laptop
  palette) is the only backdrop — no glow or gradients. The logo is the
  owner's monogram, alone, with no wordmark: one traced path in `Logo.tsx`
  drawn in `currentColor`; the favicon and app icons are that mark in lime on
  the dark background. Dark by default (`class="dark"` on `<html>`; a stored
  "light" choice from the Header toggle wins, applied by the pre-paint script
  in `index.html`, which also sets `theme-color`). Public assets are
  referenced with `import.meta.env.BASE_URL`.
- **iOS app (App Store):** Capacitor 8 (`capacitor.config.ts`, app ID
  `id.my.toowl`, Xcode project in `ios/`), built by `npm run build:ios`
  (`--base=/`, then `cap sync ios`); steps in `docs/IOS.md`. The whole `dist/`
  is bundled, so no service worker there. `src/lib/native.ts`: `isNativeApp()`
  (reads `window.Capacitor`, set by the native bridge), `downloadBlob` saves via
  the share sheet (`saveNative`; WKWebView ignores `<a download>`), and files
  opened with the app ("Open in toowl", `CFBundleDocumentTypes` in Info.plist)
  go to the matching tool, whose `FileDrop` takes them (`takeIncoming`).
  Capacitor plugins are dynamic imports only. Inside the app the install
  button and the Trakteer links are hidden (guideline 3.1.1), and `webOnly`
  tools plus slugs in `IOS_UNSUPPORTED` (`registry.ts`) are left out. Freemium goes through
  `src/lib/premium.ts` only (`usePremium`, `buyPremium`, `restorePremium`;
  product `toowl.pro`), backed on iOS by the local StoreKit 2 plugin in
  `native/store/` (auto-registered by `cap sync`); the website sells nothing.
- Link preview: `public/og.png` is rendered from `og/og.html` by
  `npm run og` (fonts and logo come from the repo, no network); meta tags
  live in `index.html` with absolute URLs.
