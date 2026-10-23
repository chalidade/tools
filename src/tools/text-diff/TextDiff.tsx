import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { diffLines, stats, withInline, type Line, type Piece } from './diff'

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

const ROW = { eq: '', add: 'bg-emerald-500/10', del: 'bg-red-500/10' } as const
const MARK = { eq: '', add: 'bg-emerald-500/30', del: 'bg-red-500/30' } as const
const SIGN = { eq: ' ', add: '+', del: '−' } as const

function Content({ line }: { line: Line }) {
  if (!line.parts) return <>{line.text || ' '}</>
  return (
    <>
      {line.parts.map((p: Piece, i) => (
        <span key={i} className={cn(p.op !== 'eq' && MARK[p.op])}>
          {p.text}
        </span>
      ))}
    </>
  )
}

export default function TextDiff() {
  const t = useT()
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [view, setView] = useState<'unified' | 'split'>('unified')
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [ignoreSpace, setIgnoreSpace] = useState(false)

  const lines = useMemo(() => {
    const o = { ignoreCase, ignoreSpace }
    return withInline(diffLines(left, right, o), o)
  }, [left, right, ignoreCase, ignoreSpace])
  const s = stats(lines)
  const hasInput = left !== '' || right !== ''

  // Split view: a run of deletions sits beside the following run of additions.
  const rows = useMemo(() => {
    const out: [Line | null, Line | null][] = []
    for (let k = 0; k < lines.length; ) {
      if (lines[k].op === 'eq') {
        out.push([lines[k], lines[k]])
        k++
        continue
      }
      const d: Line[] = []
      const a: Line[] = []
      while (k < lines.length && lines[k].op === 'del') d.push(lines[k++])
      while (k < lines.length && lines[k].op === 'add') a.push(lines[k++])
      for (let i = 0; i < Math.max(d.length, a.length); i++) out.push([d[i] ?? null, a[i] ?? null])
    }
    return out
  }, [lines])

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <textarea value={left} onChange={(e) => setLeft(e.target.value)} rows={9} spellCheck={false} aria-label={t('Teks asli', 'Original text')} placeholder={t('Teks asli…', 'Original text…')} className={area} />
        <textarea value={right} onChange={(e) => setRight(e.target.value)} rows={9} spellCheck={false} aria-label={t('Teks baru', 'Changed text')} placeholder={t('Teks baru…', 'Changed text…')} className={area} />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Tampilan', 'View')}
          value={view}
          onChange={setView}
          options={[
            { value: 'unified', label: t('Gabung', 'Unified') },
            { value: 'split', label: t('Berdampingan', 'Side by side') },
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />
          {t('Abaikan huruf besar/kecil', 'Ignore case')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ignoreSpace} onChange={(e) => setIgnoreSpace(e.target.checked)} />
          {t('Abaikan spasi', 'Ignore whitespace')}
        </label>
        <Button variant="outline" size="sm" onClick={() => { setLeft(right); setRight(left) }}>
          <ArrowLeftRight />
          {t('Tukar', 'Swap')}
        </Button>
      </div>

      {hasInput && (
        <>
          <p className="text-sm">
            {s.added === 0 && s.removed === 0 ? (
              <span className="text-muted-foreground">{t('Kedua teks sama.', 'The texts are identical.')}</span>
            ) : (
              <>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">+{s.added}</span>{' '}
                <span className="font-medium text-red-600 dark:text-red-400">−{s.removed}</span>{' '}
                <span className="text-muted-foreground">{t(`baris · ${s.same} sama`, `lines · ${s.same} unchanged`)}</span>
              </>
            )}
          </p>
          <div className="overflow-x-auto rounded-xl border font-mono text-xs sm:text-sm">
            {view === 'unified' ? (
              lines.map((l, i) => (
                <div key={i} className={cn('flex whitespace-pre-wrap break-all px-2 py-0.5', ROW[l.op])}>
                  <span className="w-5 shrink-0 select-none text-muted-foreground">{SIGN[l.op]}</span>
                  <span><Content line={l} /></span>
                </div>
              ))
            ) : (
              rows.map(([a, b], i) => (
                <div key={i} className="grid grid-cols-2 divide-x">
                  {[a, b].map((l, c) => (
                    <div key={c} className={cn('min-h-6 whitespace-pre-wrap break-all px-2 py-0.5', l && ROW[l.op])}>
                      {l && <Content line={l} />}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
