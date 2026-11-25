# {{TITLE}}: React example

```bash
npm install
npm run dev
```

Each element module (`dist/elements/<tool>.js`) registers its custom element
when imported. In your own app, copy `dist/` into your project and import the
module you need once, for example in `main.tsx`:

```ts
import './vendor/toowl/elements/{{FIRST_TOOL}}.js'
```

then render `<{{FIRST_TAG}} theme="light" />` anywhere. With TypeScript, the
`.d.ts` next to each module adds the tag to `HTMLElementTagNameMap`.
