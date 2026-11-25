import { useEffect, useState } from 'react'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { solve, type Adj, type Inputs, type Target } from './calc'

const KEY = 'tools.harga-jual'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const adj = (): Adj => ({ value: 0, unit: 'pct' })
const blank = (): Inputs => ({
  costs: { materials: 0, packaging: 0, labor: 0, other: 0, quantity: 1 },
  target: 'markup',
  targetPercent: 30,
  manualPrice: 0,
  rounding: 100,
  admin: adj(),
  service: adj(),
  tax: adj(),
  discount: adj(),
  fixed: 0,
})

function load(): Inputs {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object' && s.costs) return { ...blank(), ...s, costs: { ...blank().costs, ...s.costs } }
  } catch {
    /* storage blocked or empty */
  }
  return blank()
}

const rp = (n: number) => 'Rp ' + new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(Math.round(n))
const pct = (n: number) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(n) + '%'
const digits = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const decimal = (s: string) => Math.max(0, Number(s.replace(',', '.').replace(/[^\d.]/g, '')) || 0)
const money = (n: number) => (n ? new Intl.NumberFormat('id-ID').format(n) : '')

export default function HargaJual() {
  const t = useT()
  const [d, setD] = useState(load)
  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setD((p) => ({ ...p, [k]: v }))
  const setCost = (k: keyof Inputs['costs'], v: number) => setD((p) => ({ ...p, costs: { ...p.costs, [k]: v } }))

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(d))
    } catch {
      /* storage blocked */
    }
  }, [d])

  const r = solve(d)

  const field = (label: string, el: React.ReactNode) => (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      {el}
    </label>
  )
  const costInput = (k: Exclude<keyof Inputs['costs'], 'quantity'>, label: string) =>
    field(label, <input inputMode="numeric" value={money(d.costs[k])} onChange={(e) => setCost(k, digits(e.target.value))} placeholder="0" className={inputCls + ' text-right tabular-nums'} />)

  // A fee typed as a percent of the price or as rupiah per order.
  const adjInput = (k: 'admin' | 'service' | 'tax' | 'discount', label: string) => {
    const a = d[k]
    return (
      <div className="space-y-1">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex gap-2">
          <input
            aria-label={label}
            inputMode="decimal"
            value={a.unit === 'rp' ? money(a.value) : a.value || ''}
            onChange={(e) => set(k, { ...a, value: a.unit === 'rp' ? digits(e.target.value) : Math.min(100, decimal(e.target.value)) })}
            placeholder="0"
            className={inputCls + ' text-right tabular-nums'}
          />
          <select
            aria-label={t('Satuan', 'Unit')}
            value={a.unit}
            onChange={(e) => set(k, { value: 0, unit: e.target.value as Adj['unit'] })}
            className={inputCls + ' w-24 shrink-0'}
          >
            <option value="pct">%</option>
            <option value="rp">Rp</option>
          </select>
        </div>
      </div>
    )
  }

  const targetLabel = d.target === 'margin' ? t('Margin yang diinginkan (%)', 'Target margin (%)') : t('Markup yang diinginkan (%)', 'Target markup (%)')

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('1. HPP: biaya satu kali produksi', '1. Unit cost: one production run')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {costInput('materials', t('Bahan (Rp)', 'Materials (Rp)'))}
          {costInput('packaging', t('Kemasan (Rp)', 'Packaging (Rp)'))}
          {costInput('labor', t('Tenaga kerja (Rp)', 'Labour (Rp)'))}
          {costInput('other', t('Biaya lain (Rp)', 'Other costs (Rp)'))}
          {field(
            t('Jumlah produksi (unit)', 'Units produced'),
            <input inputMode="numeric" value={d.costs.quantity || ''} onChange={(e) => setCost('quantity', digits(e.target.value))} placeholder="1" className={inputCls + ' text-right tabular-nums'} />,
          )}
        </div>
        <p className="rounded-xl border bg-muted/40 p-3 text-sm">
          {t('HPP per unit', 'Cost per unit')}: <span className="font-semibold tabular-nums">{r.problem === 'quantity' ? '—' : rp(r.hpp)}</span>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('2. Potongan dan biaya (isi sesuai tokomu)', '2. Fees and deductions (enter your own)')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {adjInput('admin', t('Potongan admin marketplace', 'Marketplace admin fee'))}
          {adjInput('service', t('Biaya layanan / ongkir ditanggung / lainnya', 'Service fee / other per-order cost'))}
          {adjInput('tax', t('Pajak', 'Tax'))}
          {adjInput('discount', t('Diskon untuk pembeli', 'Buyer discount'))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            'Persen dihitung dari harga yang dibayar pembeli (setelah diskon); Rp dihitung per pesanan. Tarif tidak ditanam di sini karena sering berubah.',
            'Percentages apply to the price the buyer pays (after the discount); Rp is per order. Rates are not built in because they change often.',
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('3. Harga jual', '3. Selling price')}</h2>
        <Segmented
          label={t('Tentukan harga dari', 'Set the price from')}
          value={d.target}
          onChange={(v: Target) => set('target', v)}
          options={[
            { value: 'markup', label: 'Markup' },
            { value: 'margin', label: 'Margin' },
            { value: 'manual', label: t('Harga sendiri', 'My own price') },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {t(
            'Markup = laba ÷ HPP (untung 50% dari modal). Margin = laba ÷ harga jual (50% dari harga yang dibayar pembeli). Angkanya beda: markup 100% sama dengan margin 50%.',
            'Markup = profit ÷ cost (50% on top of cost). Margin = profit ÷ selling price (50% of what the buyer pays). They differ: 100% markup equals 50% margin.',
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {d.target === 'manual'
            ? field(t('Harga yang kamu pasang (Rp)', 'Your listed price (Rp)'), <input inputMode="numeric" value={money(d.manualPrice)} onChange={(e) => set('manualPrice', digits(e.target.value))} className={inputCls + ' text-right tabular-nums'} />)
            : field(targetLabel, <input inputMode="decimal" value={d.targetPercent || ''} onChange={(e) => set('targetPercent', decimal(e.target.value))} className={inputCls + ' text-right tabular-nums'} />)}
          {d.target !== 'manual' && (
            <Segmented
              label={t('Bulatkan harga ke atas', 'Round the price up to')}
              value={d.rounding}
              onChange={(v) => set('rounding', v)}
              options={[
                { value: 1, label: t('Tidak', 'No') },
                { value: 100, label: '100' },
                { value: 500, label: '500' },
                { value: 1000, label: '1.000' },
              ]}
            />
          )}
          {field(
            t('Biaya tetap yang ingin kembali (Rp, opsional)', 'Fixed costs to recover (Rp, optional)'),
            <input inputMode="numeric" value={money(d.fixed)} onChange={(e) => set('fixed', digits(e.target.value))} placeholder={t('sewa, alat, modal awal', 'rent, equipment, start-up')} className={inputCls + ' text-right tabular-nums'} />,
          )}
        </div>
      </section>

      {r.problem === 'percent' && (
        <ErrorNote
          message={t(
            'Potongan persen dan target margin sudah memakan seluruh harga, jadi harga tidak bisa dihitung. Turunkan target atau potongannya.',
            'The percentage deductions plus the target margin use up the whole price, so it cannot be worked out. Lower the target or the deductions.',
          )}
        />
      )}
      {r.problem === 'quantity' && <ErrorNote message={t('Isi jumlah produksi minimal 1 unit.', 'Enter at least 1 unit produced.')} />}

      {r.ok && (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-4" aria-live="polite">
          <div>
            <p className="text-xs text-muted-foreground">{t('Pasang harga', 'List the price at')}</p>
            <p className="text-2xl font-semibold tabular-nums">{rp(r.listPrice)}</p>
            {r.sellPrice !== r.listPrice && (
              <p className="text-sm text-muted-foreground">{t('Pembeli membayar', 'Buyer pays')} {rp(r.sellPrice)}</p>
            )}
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row k={t('HPP per unit', 'Cost per unit')} v={rp(r.hpp)} />
            <Row k={t('Potongan & biaya', 'Fees & deductions')} v={rp(r.fees)} />
            <Row k={t('Laba per unit', 'Profit per unit')} v={rp(r.profit)} strong bad={r.profit < 0} />
            <Row k="Margin" v={pct(r.margin)} />
            <Row k="Markup" v={pct(r.markup)} />
            <Row
              k={t('Titik impas', 'Break-even')}
              v={
                d.fixed <= 0
                  ? t('isi biaya tetap', 'enter fixed costs')
                  : r.breakEven === Infinity
                    ? t('tidak tercapai (rugi)', 'never (loss)')
                    : `${new Intl.NumberFormat(locale()).format(r.breakEven)} ${t('unit', 'units')}`
              }
            />
          </dl>
          {r.profit < 0 && <p className="text-sm text-destructive">{t('Harga ini rugi: laba per unit negatif.', 'This price loses money: profit per unit is negative.')}</p>}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Isian terakhir tersimpan di browser ini supaya tidak perlu mengetik ulang; tidak dikirim ke mana pun. Titik impas = biaya tetap ÷ laba per unit.',
          'Your last entry is kept in this browser so you do not retype it; nothing is sent anywhere. Break-even = fixed costs ÷ profit per unit.',
        )}
      </p>
    </div>
  )
}

function Row({ k, v, strong, bad }: { k: string; v: string; strong?: boolean; bad?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold' : ''} ${bad ? 'text-destructive' : ''}`}>{v}</dd>
    </div>
  )
}
