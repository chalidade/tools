# CLAUDE.md

Browser-only tools site, deployed to https://chalidade.github.io/tools/ by
`.github/workflows/pages.yml` on push to `main`. See README.md for the full
picture; the rules that matter when editing:

- **Everything runs client-side.** No backend, no uploads, no third-party
  processing APIs — the privacy promise on the homepage depends on it.
- **One tool = one folder** `src/tools/<slug>/` with a default-exported
  component, registered once in `src/tools/registry.ts` (lazy-loaded). Heavy
  libraries are dynamic `import()`s inside the tool, never top-level imports in
  shared code.
- Tool UIs reuse `src/components/tool/` (`FileDrop`, `ErrorNote`, `Segmented`) and
  `downloadBlob`/`withExtension` from `src/lib/download.ts`.
- **Hash routing** (`#/<slug>`, `src/lib/use-hash-route.ts`) — do not switch to
  path routing; it 404s on reload under the Pages sub-path.
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
