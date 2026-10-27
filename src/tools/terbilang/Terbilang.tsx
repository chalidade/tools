import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { MAX_DIGITS, parseNumber, toWords, type Case } from './terbilang'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function Terbilang() {
  const t = useT()
  const [raw, setRaw] = useState('1250000')
  const [lang, setLang] = useState<'id' | 'en'>('id')
  const [currency, setCurrency] = useState(true)
  const [letterCase, setLetterCase] = useState<Case>('sentence')

  const parsed = useMemo(() => parseNumber(raw), [raw])
  const words = parsed ? toWords(parsed, { lang, currency, case: letterCase }) : ''

  return (
    <div className="space-y-5">
      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        {t('Angka', 'Number')}
        <input
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="1.250.000"
          className={inputCls + ' text-2xl font-semibold tabular-nums'}
        />
      </label>

      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Bahasa hasil', 'Output language')}
          value={lang}
          onChange={setLang}
          options={[
            { value: 'id', label: 'Indonesia' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Segmented
          label={t('Huruf', 'Letters')}
          value={letterCase}
          onChange={setLetterCase}
          options={[
            { value: 'lower', label: 'abc' },
            { value: 'sentence', label: 'Abc' },
            { value: 'title', label: 'Aa Bb' },
            { value: 'upper', label: 'ABC' },
          ]}
        />
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={currency} onChange={(e) => setCurrency(e.target.checked)} />
          {t('Akhiran "rupiah" (dan sen)', 'Add "rupiah" (and sen)')}
        </label>
      </div>

      {parsed ? (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
          <p className="text-xl font-semibold leading-snug">{words}</p>
          <CopyButton text={words} variant="outline" />
        </div>
      ) : (
        <p className="text-sm text-destructive">
          {raw.trim()
            ? t(`Isi angka saja, maksimal ${MAX_DIGITS} digit. Contoh: 1.250.000 atau 1250000,50.`, `Enter digits only, up to ${MAX_DIGITS}. Example: 1,250,000 or 1250000.50.`)
            : t('Ketik angka di atas.', 'Type a number above.')}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Titik dan koma dibaca mengikuti pola penulisan: 1.234,5 (Indonesia) atau 1,234.5 (Inggris). Satu pemisah dengan tiga angka di belakangnya (1.000) dianggap pemisah ribuan. Dengan akhiran rupiah, dua angka di belakang koma dibaca sebagai sen.',
          'Dots and commas are read from the pattern: 1.234,5 (Indonesian) or 1,234.5 (English). A single separator followed by three digits (1,000) counts as a thousands separator. With the rupiah suffix, two digits after the decimal are read as sen.',
        )}
      </p>
    </div>
  )
}
