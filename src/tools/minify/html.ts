import { minifyCss } from './css'
import { minifyJs } from './js'

// Whitespace between these tags never shows, so it can go.
const BLOCK = new Set(
  'html head body title meta link base script style noscript template div p section article aside header footer nav main ul ol li dl dt dd table thead tbody tfoot tr td th caption colgroup col form fieldset legend h1 h2 h3 h4 h5 h6 hr br blockquote figure figcaption picture source option optgroup select iframe video audio canvas svg path g details summary dialog'.split(' '),
)

const tagName = (tag: string) => /^<\/?([a-zA-Z][\w:-]*)/.exec(tag)?.[1].toLowerCase()

export async function minifyHtml(code: string) {
  const parts: string[] = []
  const re =
    /<!--[\s\S]*?-->|<(pre|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>|<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<style\b([^>]*)>([\s\S]*?)<\/style\s*>|<!?[a-zA-Z/][^>]*>/gi
  let last = 0
  const pushText = (text: string) => parts.push(text.replace(/\s+/g, ' '))
  for (const m of code.matchAll(re)) {
    if (m.index > last) pushText(code.slice(last, m.index))
    last = m.index + m[0].length
    const tok = m[0]
    if (tok.startsWith('<!--')) {
      if (/^<!--\[if|^<!--\s*!/.test(tok)) parts.push(tok) // conditional and "keep" comments
    } else if (m[1]) parts.push(tok) // <pre>, <textarea>: exact
    else if (m[3] !== undefined) {
      const attrs = m[2]
      const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1].toLowerCase()
      let body = m[3]
      if (body.trim() && (!type || /javascript|module|ecmascript/.test(type))) body = await minifyJs(body)
      else if (type && /json/.test(type) && body.trim()) {
        try {
          body = JSON.stringify(JSON.parse(body))
        } catch {
          // Not valid JSON: leave it as written.
        }
      }
      parts.push(`<script${attrs.replace(/\s+/g, ' ').trimEnd()}>${body}</script>`)
    } else if (m[5] !== undefined) parts.push(`<style${m[4].replace(/\s+/g, ' ').trimEnd()}>${minifyCss(m[5])}</style>`)
    else parts.push(tok.replace(/\s+/g, ' ').replace(/\s+(\/?>)$/, '$1'))
  }
  if (last < code.length) pushText(code.slice(last))

  // Drop whitespace-only text next to block tags.
  const isBlockTag = (s: string | undefined) => !!s && s.startsWith('<') && BLOCK.has(tagName(s) ?? '')
  return parts
    .filter((p, i) => !(p === ' ' && (i === 0 || i === parts.length - 1 || isBlockTag(parts[i - 1]) || isBlockTag(parts[i + 1]))))
    .join('')
    .trim()
}

