// Shared by the minify workers. Each language has its own worker file, so only
// the library for the language picked is downloaded.
export type Lang = 'html' | 'css' | 'js'
export type Mode = 'minify' | 'beautify'

/** A syntax error with the line it points at, when the library gives one. */
export class CodeError extends Error {
  readonly line?: number
  readonly col?: number
  constructor(message: string, line?: number, col?: number) {
    super(message)
    this.line = line
    this.col = col
  }
}

