// The headless API. The source lives with the site (src/tools/json/json.ts),
// so the tool on toowl.my.id and this package are the same code.

export { parseJson, formatJson, minifyJson, stats, JsonSyntaxError, type JsonNode, type Indent } from '@/tools/json/json'
