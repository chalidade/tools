import { useState } from 'react'
import { Phone, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang, useT } from '@/lib/i18n'
import { pageUrl } from '@/lib/route'
import { P3K_CARDS, P3K_CHECKED, P3K_SOURCES, type P3kIcon } from './data'

/** Simple pictograms drawn in SVG (no image files). */
function Pictogram({ icon }: { icon: P3kIcon }) {
  const p = { stroke: 'currentColor', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <svg viewBox="0 0 80 80" className="size-16 shrink-0 rounded-xl border bg-muted/40 p-2" aria-hidden="true">
      {icon === 'choke' && (<><circle cx="40" cy="16" r="8" {...p} /><path d="M40 24v26M28 32l12 8 12-8M30 70l10-20 10 20" {...p} /><circle cx="40" cy="42" r="4" className="fill-red-500" /></>)}
      {icon === 'burn' && (<><path d="M40 10c4 12 18 18 18 34a18 18 0 0 1-36 0c0-8 5-12 8-18 2 6 6 8 6 8 0-8-2-14 4-24z" {...p} className="stroke-orange-500" /><path d="M10 70c10-6 20 6 30 0s20 6 30 0" {...p} className="stroke-sky-500" /></>)}
      {icon === 'bleed' && (<><path d="M40 8C28 28 22 38 22 48a18 18 0 0 0 36 0c0-10-6-20-18-40z" className="fill-red-500/80" /><path d="M32 50h16M40 42v16" stroke="white" strokeWidth="3" strokeLinecap="round" /></>)}
      {icon === 'faint' && (<><circle cx="14" cy="50" r="8" {...p} /><path d="M22 52h40M62 52l8-16M46 52l4 16M30 52l-2 14" {...p} /><path d="M18 24h10l-10 10h10" {...p} /></>)}
      {icon === 'seizure' && (<><circle cx="20" cy="46" r="8" {...p} /><path d="M28 48l14 6 14-8M42 54l-6 14M52 52l10 12" {...p} /><path d="M54 18l6 6-6 6 6 6M66 14l4 4-4 4" {...p} /></>)}
      {icon === 'snake' && (<><path d="M14 62c20 0 6-18 26-18s6-18 26-18" {...p} className="stroke-emerald-600" /><circle cx="66" cy="26" r="4" className="fill-emerald-600" /><path d="M70 26l6-3M70 27l6 3" {...p} strokeWidth={2} className="stroke-red-500" /></>)}
      {icon === 'fracture' && (<><path d="M14 66L36 44M44 36l22-22" {...p} strokeWidth={8} className="stroke-muted-foreground" /><path d="M32 38l16 8M38 46l4-12" {...p} className="stroke-red-500" /></>)}
    </svg>
  )
}

export default function P3k() {
  const t = useT()
  const lang = useLang()
  const [open, setOpen] = useState<string>(P3K_CARDS[0].id)
  const card = P3K_CARDS.find((c) => c.id === open) ?? P3K_CARDS[0]

  return (
    <div className="space-y-6">
      <a href="tel:112" className="sticky top-2 z-10 flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-4 text-lg font-semibold text-white shadow-lg">
        <Phone className="size-5" /> {t('Telepon 112 / 119', 'Call 112 / 119')}
      </a>

      <div role="tablist" aria-label={t('Pilih keadaan', 'Pick a situation')} className="flex flex-wrap gap-2">
        {P3K_CARDS.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === card.id}
            onClick={() => setOpen(c.id)}
            className={cn('rounded-full border px-3 py-1.5 text-sm', c.id === card.id ? 'bg-foreground text-background' : 'hover:bg-muted')}
          >
            {t(...c.title)}
          </button>
        ))}
      </div>

      <section className="space-y-4 rounded-2xl border p-4" aria-live="polite">
        <div className="flex items-center gap-3">
          <Pictogram icon={card.icon} />
          <div>
            <h2 className="text-xl font-semibold">{t(...card.title)}</h2>
            {card.urgent && (
              <p className="flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                <TriangleAlert className="size-4" /> {t('Telepon 112/119 sekarang juga', 'Call 112/119 right away')}
              </p>
            )}
          </div>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {card.steps.map((s, i) => <li key={i}>{t(...s)}</li>)}
        </ol>
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3">
          <p className="mb-1 text-sm font-semibold">{t('Jangan', 'Do not')}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {card.avoid.map((s, i) => <li key={i}>{t(...s)}</li>)}
          </ul>
        </div>
        {(card.id === 'tersedak' || card.id === 'pingsan') && (
          <a href={pageUrl('cpr', lang)} className="inline-block text-sm font-medium underline">
            {t('Buka Panduan CPR →', 'Open the CPR Guide →')}
          </a>
        )}
      </section>

      <p className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
        {t(
          'Ringkasan umum untuk pertolongan pertama, bukan pengganti pelatihan atau nasihat medis. Ikuti kursus P3K (misalnya dari PMI) dan utamakan arahan petugas darurat di telepon. Sumber: ',
          'A general first-aid summary, not a substitute for training or medical advice. Take a first-aid course (for example from the Red Cross) and follow the emergency dispatcher on the phone. Source: ',
        )}
        {P3K_SOURCES}. {t('Diperiksa', 'Checked')} {P3K_CHECKED}.
      </p>
    </div>
  )
}
