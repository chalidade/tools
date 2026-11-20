import { Fragment, useEffect, useRef, useState } from 'react'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { locale, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { RegexJob, RegexMatch, RegexReply } from './worker'

const TIME_LIMIT = 1500

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

const FLAGS = [
  { flag: 'g', id: 'semua kecocokan', en: 'all matches' },
  { flag: 'i', id: 'abaikan besar/kecil', en: 'ignore case' },
  { flag: 'm', id: '^ $ per baris', en: '^ $ per line' },
  { flag: 's', id: '. termasuk baris baru', en: '. matches newline' },
  { flag: 'u', id: 'unicode', en: 'unicode' },
] as const

const EXAMPLES: { id: string; en: string; pattern: string; flags: string; text: string }[] = [
  { id: 'Email', en: 'Email', pattern: '[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+', flags: 'gi', text: 'Kirim ke ani@contoh.co.id atau budi.s+toko@mail.com' },
  {
    id: 'No. HP Indonesia',
    en: 'Indonesian phone',
    pattern: '(?:\\+62|62|0)8[1-9]\\d{7,10}',
    flags: 'g',
    text: 'Hubungi 081234567890 atau +6285712345678, bukan 021-555-1234',
  },
  {
    id: 'Tanggal (dd/mm/yyyy)',
    en: 'Date (dd/mm/yyyy)',
    pattern: '(?<hari>0?[1-9]|[12]\\d|3[01])/(?<bulan>0?[1-9]|1[0-2])/(?<tahun>\\d{4})',
    flags: 'g',
    text: 'Lahir 17/08/1995, masuk kerja 1/2/2024.',
  },
  { id: 'Angka rupiah', en: 'Rupiah amount', pattern: 'Rp\\s?\\d{1,3}(?:\\.\\d{3})*(?:,\\d{2})?', flags: 'g', text: 'Total Rp 1.250.000, ongkir Rp15.000,50' },
  { id: 'URL', en: 'URL', pattern: 'https?://[^\\s]+', flags: 'g', text: 'Buka https://toowl.my.id/regex/ dan http://contoh.com' },
]

const CHEATS = [
  ['\\d', 'angka 0–9', 'digit 0–9'],
  ['\\w', 'huruf, angka, _', 'letter, digit, _'],
  ['\\s', 'spasi, tab, baris baru', 'space, tab, newline'],
  ['.', 'karakter apa saja', 'any character'],
  ['^ $', 'awal / akhir', 'start / end'],
  ['* + ?', '0+, 1+, 0 atau 1', '0+, 1+, 0 or 1'],
  ['{2,5}', '2 sampai 5 kali', '2 to 5 times'],
  ['[abc]', 'salah satu a, b, c', 'one of a, b, c'],
  ['(…)', 'grup tangkapan ($1)', 'capture group ($1)'],
  ['(?<n>…)', 'grup bernama ($<n>)', 'named group ($<n>)'],
  ['a|b', 'a atau b', 'a or b'],
  ['\\b', 'batas kata', 'word boundary'],
] as const

/** The name of each capture group in order (undefined for unnamed ones), read from the pattern itself. */
function groupNames(pattern: string): (string | undefined)[] {
  const names: (string | undefined)[] = []
  let inClass = false
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\') i++
    else if (inClass) inClass = c !== ']'
    else if (c === '[') inClass = true
    else if (c === '(') {
      if (pattern[i + 1] !== '?') names.push(undefined)
      else {
        const named = /^\?<([A-Za-z_$][\w$]*)>/.exec(pattern.slice(i + 1))
        if (named) names.push(named[1])
      }
    }
  }
  return names
}

type State = { matches: RegexMatch[]; capped: boolean; replaced: string | null; error: string; slow: boolean }

export default function Regex() {
  const t = useT()
  const [pattern, setPattern] = useState(EXAMPLES[0].pattern)
  const [flags, setFlags] = useState(EXAMPLES[0].flags)
  const [text, setText] = useState(EXAMPLES[0].text)
  const [replaceOn, setReplaceOn] = useState(false)
  const [replace, setReplace] = useState('[$&]')
  const [state, setState] = useState<State>({ matches: [], capped: false, replaced: null, error: '', slow: false })
  const worker = useRef<Worker | null>(null)

  useEffect(() => {
    if (!pattern) {
      setState({ matches: [], capped: false, replaced: null, error: '', slow: false })
      return
    }
    const id = setTimeout(() => {
      worker.current?.terminate()
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      worker.current = w
      const limit = setTimeout(() => {
        w.terminate()
        setState({ matches: [], capped: false, replaced: null, error: '', slow: true })
      }, TIME_LIMIT)
      w.onmessage = (e: MessageEvent<RegexReply>) => {
        clearTimeout(limit)
        w.terminate()
        if ('error' in e.data) setState({ matches: [], capped: false, replaced: null, error: e.data.error, slow: false })
        else setState({ ...e.data, error: '', slow: false })
      }
      w.postMessage({ pattern, flags, text, replace: replaceOn ? replace : null } satisfies RegexJob)
    }, 150)
    return () => clearTimeout(id)
  }, [pattern, flags, text, replaceOn, replace])

  useEffect(() => () => worker.current?.terminate(), [])

  const names = groupNames(pattern)
  const toggle = (f: string) => setFlags((cur) => (cur.includes(f) ? cur.replace(f, '') : cur + f))

  // The test text with each match marked.
  const pieces: { text: string; match?: number }[] = []
  let at = 0
  state.matches.forEach((m, i) => {
    if (m.index < at) return
    if (m.index > at) pieces.push({ text: text.slice(at, m.index) })
    pieces.push({ text: m.text || '​', match: i })
    at = m.index + m.text.length
  })
  if (at < text.length) pieces.push({ text: text.slice(at) })

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center rounded-xl border bg-background font-mono text-sm focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-muted-foreground">/</span>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            spellCheck={false}
            aria-label={t('Pola', 'Pattern')}
            className="min-w-0 flex-1 bg-transparent px-1 py-2 outline-none"
          />
          <span className="pr-3 text-muted-foreground">/{[...flags].sort().join('')}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {FLAGS.map((f) => (
            <label key={f.flag} className="flex items-center gap-1.5">
              <input type="checkbox" checked={flags.includes(f.flag)} onChange={() => toggle(f.flag)} />
              <code className="font-mono">{f.flag}</code>
              <span className="text-muted-foreground">{t(f.id, f.en)}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground">{t('Contoh:', 'Examples:')}</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                setPattern(ex.pattern)
                setFlags(ex.flags)
                setText(ex.text)
              }}
              className="rounded-lg border px-2 py-1 text-xs hover:border-brand-2"
            >
              {t(ex.id, ex.en)}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        spellCheck={false}
        aria-label={t('Teks uji', 'Test text')}
        placeholder={t('Teks yang diuji…', 'Text to test…')}
        className={area}
      />

      {state.error && <ErrorNote message={state.error} />}
      {state.slow && (
        <ErrorNote
          message={t(
            `Pola berhenti setelah ${(TIME_LIMIT / 1000).toLocaleString(locale())} detik: kemungkinan backtracking berlebihan, misalnya (a+)+. Sederhanakan polanya.`,
            `The pattern was stopped after ${TIME_LIMIT / 1000} seconds: likely catastrophic backtracking, e.g. (a+)+. Simplify the pattern.`,
          )}
        />
      )}

      {!state.error && !state.slow && pattern && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {state.matches.length}
            {state.capped ? '+' : ''} {t('kecocokan', state.matches.length === 1 ? 'match' : 'matches')}
          </p>
          <pre className="max-h-64 overflow-auto rounded-xl border bg-muted/40 p-3 font-mono text-sm whitespace-pre-wrap break-words">
            {pieces.map((p, i) =>
              p.match === undefined ? (
                <Fragment key={i}>{p.text}</Fragment>
              ) : (
                <mark key={i} className={cn('rounded-sm px-px text-brand-ink', p.match % 2 ? 'bg-brand-fill/60' : 'bg-brand-fill')}>
                  {p.text}
                </mark>
              ),
            )}
          </pre>
          {state.matches.length > 0 && state.matches.some((m) => m.groups.length) && (
            <div className="max-h-64 overflow-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">{t('Cocok', 'Match')}</th>
                    {state.matches[0].groups.map((_, g) => (
                      <th key={g} className="px-2 py-1.5">
                        ${g + 1}
                        {names[g] ? ` (${names[g]})` : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.matches.slice(0, 200).map((m, i) => (
                    <tr key={i} className="border-t font-mono">
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-1.5">{m.text}</td>
                      {m.groups.map((g, j) => (
                        <td key={j} className="px-2 py-1.5">
                          {g ?? <span className="text-muted-foreground">–</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={replaceOn} onChange={(e) => setReplaceOn(e.target.checked)} />
          {t('Mode ganti (replace)', 'Replace mode')}
        </label>
        {replaceOn && (
          <>
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              spellCheck={false}
              aria-label={t('Ganti dengan', 'Replace with')}
              placeholder="$1, $<nama>, $&"
              className="w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {state.replaced !== null && (
              <>
                <textarea readOnly value={state.replaced} rows={4} aria-label={t('Hasil', 'Result')} className={area} />
                <CopyButton text={state.replaced} variant="outline" />
              </>
            )}
          </>
        )}
      </div>

      <details className="rounded-xl border p-3 text-sm">
        <summary className="cursor-pointer font-medium">{t('Contekan singkat', 'Cheat sheet')}</summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {CHEATS.map(([code, id, en]) => (
            <Fragment key={code}>
              <dt className="font-mono text-brand-2">{code}</dt>
              <dd className="text-muted-foreground">{t(id, en)}</dd>
            </Fragment>
          ))}
        </dl>
      </details>
      <p className="text-xs text-muted-foreground">
        {t(
          'Mesinnya RegExp JavaScript (seperti di browser dan Node.js); hasilnya bisa sedikit beda dengan PCRE di PHP atau re di Python. Pola dijalankan terpisah dengan batas waktu, jadi pola yang macet tidak membekukan halaman.',
          'The engine is JavaScript RegExp (as in browsers and Node.js); results can differ slightly from PCRE in PHP or re in Python. Patterns run separately with a time limit, so a runaway pattern never freezes the page.',
        )}
      </p>
    </div>
  )
}
