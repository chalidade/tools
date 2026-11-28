import fs from 'node:fs'
const dirs = fs.readdirSync('.').filter(d => fs.existsSync(`${d}/.actor/actor.json`))
const MARK = '<!-- toowl-footer -->'
for (const d of dirs) {
  const name = JSON.parse(fs.readFileSync(`${d}/.actor/actor.json`, 'utf8')).name
  const p = `${d}/README.md`
  let md = fs.readFileSync(p, 'utf8')
  md = md.split(MARK)[0].trimEnd()
  const hasApi = /run-sync-get-dataset-items/.test(md)
  const EXAMPLES = {
    'pdf-toolkit': '{"operation":"merge","files":[{"url":"https://example.com/a.pdf"},{"url":"https://example.com/b.pdf"}]}',
    'qr-code-generator': '{"items":["https://example.com/menu","https://example.com/table/12"],"format":"png"}',
    'barcode-generator': '{"codes":["5901234123457","ABC-12345"],"type":"auto","format":"png"}',
    'favicon-generator': '{"files":[{"url":"https://example.com/logo.png"}],"appName":"My App"}',
  }
  const example = EXAMPLES[name] ?? '{"files":[{"url":"https://example.com/your-file"}]}'
  const api = hasApi ? '' : `
## Call it from your code

\`\`\`bash
curl -X POST "https://api.apify.com/v2/acts/toowl~${name}/run-sync-get-dataset-items" \\
  -H "Authorization: Bearer $APIFY_TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '${example}'
\`\`\`

The same call works from Python (\`apify-client\`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).
`
  md += `

${MARK}${api}
## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

\`\`\`
https://mcp.apify.com/?actors=toowl/${name}
\`\`\`

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF to image, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
`
  fs.writeFileSync(p, md)
  console.log(d, name, hasApi ? 'has-api' : 'added-api')
}
