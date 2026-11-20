import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { lorem, type Lang, type Unit } from './lorem'

const LIMITS: Record<Unit, number> = { paragraphs: 50, sentences: 200, words: 2000 }

export default function LoremIpsum() {
  const t = useT()
  const [unit, setUnit] = useState<Unit>('paragraphs')
  const [count, setCount] = useState(3)
  const [lang, setLang] = useState<Lang>('latin')
  const [classic, setClassic] = useState(true)
  const [html, setHtml] = useState(false)
  const [seed, setSeed] = useState(() => Date.now())

  const blocks = useMemo(() => lorem({ unit, count, lang, classic, seed }), [unit, count, lang, classic, seed])
  const text = html ? blocks.map((b) => `<p>${b}</p>`).join('\n') : blocks.join('\n\n')
  const words = blocks.join(' ').split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Satuan', 'Unit')}
          value={unit}
          onChange={(u) => {
            setUnit(u)
            setCount(u === 'paragraphs' ? 3 : u === 'sentences' ? 5 : 50)
          }}
          options={[
            { value: 'paragraphs', label: t('Paragraf', 'Paragraphs') },
            { value: 'sentences', label: t('Kalimat', 'Sentences') },
            { value: 'words', label: t('Kata', 'Words') },
          ]}
        />
        <label className="space-y-2 text-xs font-medium text-muted-foreground">
          <span className="block">
            {t('Jumlah', 'Count')} (1–{LIMITS[unit]})
          </span>
          <input
            type="number"
            min={1}
            max={LIMITS[unit]}
            value={count}
            onChange={(e) => setCount(Math.min(LIMITS[unit], Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
            className="w-28 rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Segmented
          label={t('Bahasa teks', 'Text language')}
          value={lang}
          onChange={setLang}
          options={[
            { value: 'latin', label: 'Lorem ipsum' },
            { value: 'id', label: 'Indonesia' },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={classic} onChange={(e) => setClassic(e.target.checked)} />
          {lang === 'latin' ? t('Mulai dengan "Lorem ipsum dolor sit amet"', 'Start with "Lorem ipsum dolor sit amet"') : t('Mulai dengan kalimat pembuka tetap', 'Start with the fixed opening sentence')}
        </label>
        {unit === 'paragraphs' && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={html} onChange={(e) => setHtml(e.target.checked)} />
            {t('Bungkus dengan <p>', 'Wrap in <p>')}
          </label>
        )}
      </div>
      <textarea readOnly value={text} rows={12} aria-label={t('Hasil', 'Result')} className="w-full resize-y rounded-xl border bg-background p-3 text-sm leading-relaxed outline-none" />
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={text} variant="outline" />
        <Button size="sm" variant="outline" onClick={() => setSeed((s) => s + 1)}>
          <RefreshCw />
          {t('Buat lagi', 'Regenerate')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {words.toLocaleString()} {t('kata', 'words')} · {text.length.toLocaleString()} {t('karakter', 'characters')}
        </span>
      </div>
    </div>
  )
}
