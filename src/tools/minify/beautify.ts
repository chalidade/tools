import beautify from 'js-beautify'
import type { Lang } from './errors'

export function beautifyCode(lang: Lang, code: string, indent: number) {
  const opts = { indent_size: indent, end_with_newline: true, preserve_newlines: true, max_preserve_newlines: 2 }
  return lang === 'js' ? beautify.js(code, opts) : lang === 'css' ? beautify.css(code, opts) : beautify.html(code, { ...opts, indent_inner_html: true })
}
