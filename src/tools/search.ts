import { CATEGORIES, TOOLS, type Tool } from './registry'
import { CATEGORIES_EN, TOOLS_EN } from './registry-en'

/** Lowercase, accents stripped, so "kompresi" and "KOMPRÉS" compare alike. */
const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const categoryTitle = new Map(CATEGORIES.map((c) => [c.id, `${c.title} ${CATEGORIES_EN[c.id].title}`]))

/** The words of a text, for prefix matching ("kompres" matches "kompresi", but "word" does not match "password"). */
const tokens = (text: string) => normalize(text).split(/[^a-z0-9]+/).filter(Boolean)
const hits = (words: string[], query: string) => words.some((w) => w.startsWith(query))

/**
 * Tools matching every word of the query, best match first: a word in the
 * title counts most, then keywords/formats, then the description.
 */
export function searchTools(query: string): Tool[] {
  const words = tokens(query)
  if (!words.length) return TOOLS

  const scored: { tool: Tool; score: number }[] = []
  for (const tool of TOOLS) {
    // Both languages always count: "kompres" and "compress" find the same tool.
    const en = TOOLS_EN[tool.slug]
    const title = tokens(`${tool.title} ${en?.title ?? ''}`)
    const tags = tokens([tool.formats, ...tool.keywords, ...(en?.keywords ?? []), categoryTitle.get(tool.category) ?? ''].join(' '))
    const description = tokens(`${tool.description} ${en?.description ?? ''}`)
    let score = 0
    let all = true
    for (const word of words) {
      if (hits(title, word)) score += title.includes(word) ? 6 : 4
      else if (hits(tags, word)) score += 3
      else if (hits(description, word)) score += 1
      else {
        all = false
        break
      }
    }
    if (all) scored.push({ tool, score })
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.tool)
}
