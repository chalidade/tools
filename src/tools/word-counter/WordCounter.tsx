import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { locale, tr, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { analyze, LIMITS, minutesToParts } from './count'

function time(minutes: number): string {
  if (minutes <= 0) return '0'
  const { min, sec } = minutesToParts(minutes)
  if (min === 0) return tr(`${Math.max(sec, 1)} dtk`, `${Math.max(sec, 1)} sec`)
  return sec ? tr(`${min} mnt ${sec} dtk`, `${min} min ${sec} sec`) : tr(`${min} mnt`, `${min} min`)
}

export default function WordCounter() {
  const t = useT()
  const [text, setText] = useState('')
  const s = useMemo(() => analyze(text), [text])
  const fmt = (n: number) => n.toLocaleString(locale())

  const stats: [string, string][] = [
    [t('Kata', 'Words'), fmt(s.words)],
    [t('Karakter', 'Characters'), fmt(s.chars)],
    [t('Tanpa spasi', 'No spaces'), fmt(s.charsNoSpaces)],
    [t('Kalimat', 'Sentences'), fmt(s.sentences)],
    [t('Paragraf', 'Paragraphs'), fmt(s.paragraphs)],
    [t('Baris', 'Lines'), fmt(s.lines)],
    [t('Waktu baca', 'Reading time'), time(s.readMinutes)],
    [t('Waktu bicara', 'Speaking time'), time(s.speakMinutes)],
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          aria-label={t('Teks', 'Text')}
          placeholder={t('Ketik atau tempel teks di sini…', 'Type or paste text here…')}
          className="w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex gap-2">
          <CopyButton text={text} variant="outline" />
          <Button variant="outline" size="sm" disabled={!text} onClick={() => setText('')}>
            <Trash2 />
            {t('Kosongkan', 'Clear')}
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-muted/40 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        {t(
          'Waktu baca dihitung 230 kata per menit, waktu bicara 130 kata per menit.',
          'Reading time assumes 230 words per minute, speaking time 130 words per minute.',
        )}
      </p>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('Batas karakter', 'Character limits')}</h3>
        <ul className="space-y-3">
          {LIMITS.map((l) => {
            const over = s.chars > l.max
            const pct = Math.min(100, (s.chars / l.max) * 100)
            return (
              <li key={l.id} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span>{l.name}</span>
                  <span className={cn('tabular-nums', over ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                    {fmt(s.chars)} / {fmt(l.max)}
                    {over && ` (+${fmt(s.chars - l.max)})`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full rounded-full', over ? 'bg-destructive' : pct > 90 ? 'bg-orange-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
                </div>
                {l.soft && over && (
                  <p className="text-xs text-muted-foreground">
                    {t('Google biasanya memotong teks yang lebih panjang.', 'Google usually truncates anything longer.')}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
