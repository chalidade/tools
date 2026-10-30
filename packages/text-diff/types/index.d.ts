// Public types of @chalidade/text-diff. They mirror
// src/tools/text-diff/diff.ts; types/check.ts fails the build if they drift.

/** Unchanged, added (only in the right text) or deleted (only in the left). */
export type Op = 'eq' | 'add' | 'del'

export interface Piece {
  op: Op
  text: string
}

export interface Line {
  op: Op
  text: string
  /** Word-level pieces when a deleted line pairs with an added one. */
  parts?: Piece[]
}

export interface Options {
  ignoreCase: boolean
  /** Ignore leading/trailing whitespace and runs of spaces. */
  ignoreSpace: boolean
}

/** Line-by-line diff of two texts. */
export declare function diffLines(left: string, right: string, o: Options): Line[]
/** Word-by-word diff of two texts (whitespace is kept as its own pieces). */
export declare function diffWords(left: string, right: string, o: Options): Piece[]
/** LCS diff of any two token arrays. */
export declare function diffTokens(a: string[], b: string[]): Piece[]
/** Pairs each run of deleted lines with the added lines after it and fills in `parts` for word-level highlighting. */
export declare function withInline(lines: Line[], o: Options): Line[]
/** Splits on \n, \r\n or \r; an empty string has no lines. */
export declare function splitLines(s: string): string[]
/** Counts of added, removed and unchanged lines. */
export declare function stats(lines: Line[]): { added: number; removed: number; same: number }
