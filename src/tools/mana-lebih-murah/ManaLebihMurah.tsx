import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { locale, useT } from '@/lib/i18n'
import { parseNumber } from '@/tools/persen/percent'
import { compare, displayPrice, unitPrice, UNITS, type Pack, type Unit } from './unit-price'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface Row {
  price: string
  count: string
  size: string
  unit: Unit
}

const blank = (): Row => ({ price: '', count: '1', size: '', unit: 'g' })

const toPack = (r: Row): Pack => ({ price: parseNumber(r.price), count: parseNumber(r.count), size: parseNumber(r.size), unit: r.unit })

export default function ManaLebihMurah() {
  const t = useT()
  const fmt = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: n < 10 ? 2 : 0 })
  const [rows, setRows] = useState<Row[]>([blank(), blank()])

  const packs = rows.map(toPack)
  const result = compare(packs)
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {rows.map((r, i) => {
          const ranked = unitPrice(packs[i])
          const shown = ranked ? displayPrice(ranked) : null
          const best = i === result.best && rows.length > 1
          return (
            <div key={i} className={`space-y-3 rounded-2xl border p-3 ${best ? 'border-emerald-500 bg-emerald-500/5' : 'bg-card'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {t('Kemasan', 'Pack')} {i + 1}
                  {best && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">{t('Termurah', 'Cheapest')}</span>}
                </p>
                {rows.length > 2 && (
                  <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t('Hapus kemasan', 'Remove pack')} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  {t('Harga (Rp)', 'Price (Rp)')}
                  <input inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: e.target.value })} className={inputCls} placeholder="12.500" />
                </label>
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  {t('Jumlah isi', 'Pieces')}
                  <input inputMode="numeric" value={r.count} onChange={(e) => set(i, { count: e.target.value })} className={inputCls} placeholder="1" />
                </label>
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  {t('Ukuran', 'Size')}
                  <input inputMode="decimal" value={r.size} onChange={(e) => set(i, { size: e.target.value })} className={inputCls} placeholder="500" />
                </label>
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  {t('Satuan', 'Unit')}
                  <select value={r.unit} onChange={(e) => set(i, { unit: e.target.value as Unit })} className={inputCls}>
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.value === 'l' ? 'L' : u.value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {shown && (
                <p className="text-sm tabular-nums">
                  <span className="font-semibold">Rp {fmt(shown.value)}</span> / {shown.per}
                  {result.extra[i] !== null && result.extra[i]! > 0.05 && (
                    <span className="ml-2 text-muted-foreground">
                      {t(`${fmt(result.extra[i]!)}% lebih mahal`, `${fmt(result.extra[i]!)}% pricier`)}
                    </span>
                  )}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {rows.length < 6 && (
        <button type="button" onClick={() => setRows([...rows, blank()])} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-muted">
          <Plus className="size-4" />
          {t('Tambah kemasan', 'Add pack')}
        </button>
      )}

      {result.mixed && (
        <p className="text-sm text-destructive">
          {t('Berat (g/kg) dan volume (ml/L) tidak bisa dibandingkan; hanya satuan dari kemasan pertama yang dihitung.', 'Weight (g/kg) and volume (ml/L) cannot be compared; only the same kind as the first pack is ranked.')}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Isi "Jumlah isi" bila satu kemasan berisi beberapa buah (mis. 6 kaleng × 330 ml). Semua dihitung di perangkat ini.',
          'Use "Pieces" when a pack holds several items (e.g. 6 cans × 330 ml). Everything is computed on this device.',
        )}
      </p>
    </div>
  )
}
