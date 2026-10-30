// The headless API. The source lives with the site (src/tools/json/json.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.

export { parseJson, formatJson, minifyJson, stats, JsonSyntaxError, type JsonNode, type Indent } from '@/tools/json/json'
