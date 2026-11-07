// Text case and whitespace helpers. Pure functions, nothing leaves the browser.

export type Action =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'collapse-spaces'
  | 'remove-blank-lines'
  | 'join-lines'

export const ACTIONS: { id: Action; label: readonly [string, string]; sample: string }[] = [
  { id: 'upper', label: ['HURUF BESAR', 'UPPERCASE'], sample: 'ABC' },
  { id: 'lower', label: ['huruf kecil', 'lowercase'], sample: 'abc' },
  { id: 'title', label: ['Judul Tiap Kata', 'Title Case'], sample: 'Abc' },
  { id: 'sentence', label: ['Kalimat biasa', 'Sentence case'], sample: 'Abc.' },
  { id: 'collapse-spaces', label: ['Hapus spasi ganda', 'Collapse extra spaces'], sample: '␣' },
  { id: 'remove-blank-lines', label: ['Hapus baris kosong', 'Remove blank lines'], sample: '¶' },
  { id: 'join-lines', label: ['Satukan baris', 'Join lines'], sample: '↵' },
]

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu

export function titleCase(s: string) {
  return s.toLocaleLowerCase().replace(WORD, (w) => w.charAt(0).toLocaleUpperCase() + w.slice(1))
}

/** Capitalise the first letter of each sentence; everything else lowercase. */
export function sentenceCase(s: string) {
  let start = true
  let out = ''
  for (const ch of s.toLocaleLowerCase()) {
    if (start && /\p{L}/u.test(ch)) {
      out += ch.toLocaleUpperCase()
      start = false
    } else {
      out += ch
      if (/[.!?\n]/.test(ch)) start = true
      else if (/[\p{L}\p{N}]/u.test(ch)) start = false
    }
  }
  return out
}

export function apply(action: Action, text: string): string {
  switch (action) {
    case 'upper':
      return text.toLocaleUpperCase()
    case 'lower':
      return text.toLocaleLowerCase()
    case 'title':
      return titleCase(text)
    case 'sentence':
      return sentenceCase(text)
    case 'collapse-spaces':
      return text
        .split('\n')
        .map((l) => l.replace(/[ \t ]+/g, ' ').replace(/^ | $/g, ''))
        .join('\n')
    case 'remove-blank-lines':
      return text
        .split('\n')
        .filter((l) => l.trim() !== '')
        .join('\n')
    case 'join-lines':
      return text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
  }
}
