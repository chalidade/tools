import { minify } from 'terser'
import { CodeError } from './errors'

export async function minifyJs(code: string) {
  try {
    const out = await minify(code, { compress: true, mangle: true, format: { comments: /^!|@license|@preserve/ } })
    return out.code ?? ''
  } catch (e) {
    const err = e as { message?: string; line?: number; col?: number }
    throw new CodeError(err.message ?? String(e), err.line, err.col)
  }
}

