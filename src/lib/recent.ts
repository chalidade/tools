// The tools this visitor opened last, newest first, so the home page can
// offer them again. Kept in this browser only (localStorage), like everything
// else on the site.

const KEY = 'tools:recent'
const MAX = 6

export function recentSlugs(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((s): s is string => typeof s === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

export function rememberTool(slug: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([slug, ...recentSlugs().filter((s) => s !== slug)].slice(0, MAX)))
  } catch {
    // Storage blocked (private mode): the home page just shows no recent tools.
  }
}
