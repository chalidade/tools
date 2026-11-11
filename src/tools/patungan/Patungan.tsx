import { useState } from 'react'
import { Plus, Trash2, Share2 } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { CopyButton } from '@/components/tool/CopyButton'
import { locale, useT } from '@/lib/i18n'
import { num, splitBill, summaryText, type Item, type Mode, type Person, type Rounding } from './split'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

let nextId = 10

export default function Patungan() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const [mode, setMode] = useState<Mode>('items')
  const [people, setPeople] = useState<Person[]>([
    { id: 1, name: '' },
    { id: 2, name: '' },
  ])
  const [items, setItems] = useState<Item[]>([{ id: 1, name: '', price: 0, who: [] }])
  const [equalTotal, setEqualTotal] = useState('')
  const [service, setService] = useState('')
  const [tax, setTax] = useState('')
  const [rounding, setRounding] = useState<Rounding>('exact')

  const label = (p: Person, i: number) => p.name.trim() || t(`Orang ${i + 1}`, `Person ${i + 1}`)
  const named = people.map((p, i) => ({ ...p, name: label(p, i) }))

  const split = splitBill({
    people: named,
    items,
    mode,
    equalTotal: num(equalTotal),
    servicePct: Math.min(num(service), 100),
    taxPct: Math.min(num(tax), 100),
    rounding,
  })

  const text = split
    ? summaryText(split, {
        title: t('Patungan — siapa bayar berapa', 'Bill split — who pays what'),
        rp,
        labels: {
          subtotal: t('Subtotal', 'Subtotal'),
          service: 'Service',
          tax: t('Pajak', 'Tax'),
          total: t('Total tagihan', 'Bill total'),
          extra: t('Kelebihan karena pembulatan', 'Extra from rounding'),
          each: '',
        },
      })
    : ''

  const setItem = (id: number, patch: Partial<Item>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const toggle = (it: Item, pid: number) => {
    const cur = it.who.length ? it.who : people.map((p) => p.id)
    const next = cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid]
    // Everyone ticked (or nobody) is stored as [] = everyone.
    setItem(it.id, { who: next.length === people.length || next.length === 0 ? [] : next })
  }
  const removePerson = (id: number) => {
    setPeople((l) => l.filter((p) => p.id !== id))
    setItems((l) => l.map((it) => ({ ...it, who: it.who.filter((x) => x !== id) })))
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text })
        return
      }
    } catch {
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Cara bagi', 'Split by')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'items', label: t('Per item', 'Per item') },
          { value: 'equal', label: t('Dibagi rata', 'Equally') },
        ]}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">{t('Siapa saja', 'Who is in')}</h2>
        {people.map((p, i) => (
          <div key={p.id} className="flex gap-2">
            <input
              value={p.name}
              onChange={(e) => setPeople((l) => l.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
              className={inputCls}
              placeholder={t(`Orang ${i + 1}`, `Person ${i + 1}`)}
              aria-label={t(`Nama orang ${i + 1}`, `Name of person ${i + 1}`)}
            />
            {people.length > 1 && (
              <button type="button" onClick={() => removePerson(p.id)} aria-label={t('Hapus orang', 'Remove person')} className="rounded-xl border px-3 hover:bg-muted">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPeople((l) => [...l, { id: nextId++, name: '' }])}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="size-4" /> {t('Tambah orang', 'Add person')}
        </button>
      </section>

      {mode === 'equal' ? (
        <label className="block max-w-xl space-y-1 text-xs font-medium text-muted-foreground">
          {t('Total belanja sebelum pajak (Rp)', 'Total before tax (Rp)')}
          <input inputMode="decimal" value={equalTotal} onChange={(e) => setEqualTotal(e.target.value)} className={inputCls} placeholder="250.000" />
        </label>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">{t('Pesanan', 'Items')}</h2>
          {items.map((it, i) => (
            <div key={it.id} className="space-y-2 rounded-xl border p-3">
              <div className="flex gap-2">
                <input
                  value={it.name}
                  onChange={(e) => setItem(it.id, { name: e.target.value })}
                  className={inputCls}
                  placeholder={t(`Item ${i + 1}`, `Item ${i + 1}`)}
                  aria-label={t('Nama item', 'Item name')}
                />
                <input
                  inputMode="decimal"
                  value={it.price ? String(it.price) : ''}
                  onChange={(e) => setItem(it.id, { price: num(e.target.value) })}
                  className={inputCls + ' max-w-36'}
                  placeholder="Rp"
                  aria-label={t('Harga', 'Price')}
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))} aria-label={t('Hapus item', 'Remove item')} className="rounded-xl border px-3 hover:bg-muted">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('Dimakan oleh', 'Shared by')}>
                {named.map((p) => {
                  const on = !it.who.length || it.who.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(it, p.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setItems((l) => [...l, { id: nextId++, name: '', price: 0, who: [] }])}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Plus className="size-4" /> {t('Tambah item', 'Add item')}
          </button>
        </section>
      )}

      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Service (%)', 'Service (%)')}
          <input inputMode="decimal" value={service} onChange={(e) => setService(e.target.value)} className={inputCls} placeholder="5" />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Pajak (%)', 'Tax (%)')}
          <input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} className={inputCls} placeholder="10" />
        </label>
      </div>

      <Segmented
        label={t('Pembulatan', 'Rounding')}
        value={String(rounding)}
        onChange={(v) => setRounding(v === 'exact' ? 'exact' : (Number(v) as Rounding))}
        options={[
          { value: 'exact', label: t('Pas', 'Exact') },
          { value: '100', label: '100' },
          { value: '500', label: '500' },
          { value: '1000', label: '1.000' },
        ]}
      />

      {split ? (
        <section className="space-y-3">
          <div className="divide-y rounded-xl border">
            {split.shares.map((s) => (
              <div key={s.person.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{s.person.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {rp(s.subtotal)}
                    {s.service ? ` + service ${rp(s.service)}` : ''}
                    {s.tax ? ` + ${t('pajak', 'tax')} ${rp(s.tax)}` : ''}
                  </p>
                </div>
                <p className="text-xl font-semibold tabular-nums">{rp(s.total)}</p>
              </div>
            ))}
            <div className="flex items-baseline justify-between bg-muted/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">{t('Total tagihan', 'Bill total')}</p>
              <p className="font-semibold tabular-nums">{rp(split.grand)}</p>
            </div>
          </div>
          {split.extra > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('Karena dibulatkan ke atas, terkumpul', 'Because of rounding up, you collect')} {rp(split.extra)} {t('lebih dari tagihan.', 'more than the bill.')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <CopyButton text={text} variant="outline" label={t('Salin rangkuman', 'Copy summary')} />
            <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
              <Share2 className="size-4" />
              {t('Kirim ke WhatsApp', 'Send to WhatsApp')}
            </button>
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Isi harga pesanan untuk melihat siapa bayar berapa.', 'Enter prices to see who pays what.')}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Item yang dimakan beberapa orang dibagi sama rata di antara mereka. Service dihitung dari subtotal, pajak dari subtotal + service, lalu keduanya dibagi sesuai porsi tiap orang. Sisa rupiah dibagikan satu per satu supaya jumlahnya tepat sama dengan tagihan.',
          'An item shared by several people is split evenly between them. Service is charged on the subtotal and tax on subtotal + service, then both are shared in proportion to each person. Leftover rupiah are handed out one by one so the parts add up exactly to the bill.',
        )}
      </p>
    </div>
  )
}
