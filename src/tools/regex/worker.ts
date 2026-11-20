// Runs the match away from the page: a pattern that backtracks forever only
// stalls this worker, which the page kills after a time limit.
export interface RegexJob {
  pattern: string
  flags: string
  text: string
  replace: string | null
}
export interface RegexMatch {
  index: number
  text: string
  groups: (string | undefined)[]
  named: Record<string, string | undefined> | null
}
export type RegexReply = { matches: RegexMatch[]; capped: boolean; replaced: string | null } | { error: string }

const MAX = 2000

self.onmessage = (e: MessageEvent<RegexJob>) => {
  const { pattern, flags, text, replace } = e.data
  let re: RegExp
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) } satisfies RegexReply)
    return
  }
  const matches: RegexMatch[] = []
  let capped = false
  for (const m of text.matchAll(re)) {
    if (matches.length >= MAX) {
      capped = true
      break
    }
    matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups ? { ...m.groups } : null })
    // Without "g" only the first match counts.
    if (!flags.includes('g')) break
  }
  const replaced = replace === null ? null : text.replace(new RegExp(pattern, flags), replace)
  self.postMessage({ matches, capped, replaced } satisfies RegexReply)
}
