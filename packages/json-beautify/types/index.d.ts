// Public types of @chalidade/json-beautify. They mirror src/tools/json/json.ts;
// types/check.ts fails the build if they drift.

/** Parsed JSON that keeps every literal exactly as written. */
export type JsonNode =
  | { type: 'object'; entries: { key: string; value: JsonNode }[] }
  | { type: 'array'; items: JsonNode[] }
  /** `raw` is the literal as written: a quoted string, number, true, false or null. */
  | { type: 'literal'; raw: string }

/** A syntax error with a readable message and its 1-based position. */
export declare class JsonSyntaxError extends Error {
  line: number
  column: number
  /** 0-based character offset (after a byte-order mark, if any). */
  offset: number
  constructor(message: string, source: string, offset: number)
}

/**
 * Parses JSON without turning numbers into doubles, so 12345678901234567890
 * and 1.0 survive untouched. Throws JsonSyntaxError.
 */
export declare function parseJson(source: string): JsonNode

export type Indent = 2 | 4 | 'tab'

/** Pretty-printed JSON with a trailing newline; `sortKeys` orders object keys A–Z. */
export declare function formatJson(node: JsonNode, opts: { indent: Indent; sortKeys: boolean }): string
/** JSON on one line with no whitespace outside strings. */
export declare function minifyJson(node: JsonNode): string
/** Total number of object keys and the deepest nesting level. */
export declare function stats(node: JsonNode): { keys: number; depth: number }
