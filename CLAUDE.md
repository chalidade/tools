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
- **Hash routing** (`#/<slug>`, `src/lib/use-hash-route.ts`) — do not switch to
  path routing; it 404s on reload under the Pages sub-path.
- The home page opens with a walkable RPG town (`src/components/Playground.tsx`):
  one building per category, each in its own style (`playground/Buildings.tsx`:
  print shop, library, vault, studio, lab — assigned in category order).
  Walking into a door enters it; inside, each tool is a cartoon keeper
  (`playground/Person.tsx`) in that building's uniform who explains the tool
  in a dialog (`playground/Dialog.tsx`) and offers to open it. Town layout
  (winding paths, plaza, pond, tall grass, benches, lamps, trees), collision
  and A* click-to-walk live in `playground/scenes.ts`, all laid out from the
  registry — a new tool appears automatically. Townsfolk, their dog and their
  chatter are in `playground/residents.ts`; what a keeper says is in
  `playground/dialog.ts` (add lines for a new tool there; without them it
  explains itself from its registry description). The loop moves sprites by
  mutating `style.transform` on refs (never React state per frame); `.pg-*`
  styles and animations live in `src/index.css`. The world is `aria-hidden`;
  the ToolGrid below stays the accessible way in. Visited stamps persist in
  localStorage (`tools:visited`).
- `App.tsx` only composes sections; each section lives in
  `src/components/<Section>.tsx`. Style with the semantic shadcn tokens in
  `src/index.css`, not hard-coded colors. Animation via `motion/react`.
- UI copy is Indonesian.
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
