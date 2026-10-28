import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { amountFromInput, totals, type Item } from './doc'
import { amountWords, buildPdf, rupiahText, type DocData } from './pdf'

const KEY = 'tools.kwitansi'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const today = () => new Date().toLocaleDateString('en-CA')
const blank = (): DocData => ({
  mode: 'kwitansi',
  number: '001',
  date: today(),
  fromName: '',
  fromAddress: '',
  toName: '',
  toAddress: '',
  purpose: '',
  amount: 0,
  items: [{ id: 1, name: '', qty: 1, price: 0 }],
  discount: 0,
  taxPercent: 0,
  notes: '',
  place: '',
  signer: '',
})

// The last document is kept on this device so the next one starts filled in.
function load(): DocData {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object' && Array.isArray(s.items) && s.items.length) return { ...blank(), ...s, date: today() }
  } catch {
    /* storage blocked or empty */
  }
  return blank()
}

export default function Kwitansi() {
  const t = useT()
  const [d, setD] = useState(load)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof DocData>(k: K, v: DocData[K]) => setD((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(d))
    } catch {
      /* storage blocked */
    }
  }, [d])

  const sum = useMemo(() => totals(d.items, d.discount, d.taxPercent), [d.items, d.discount, d.taxPercent])
  const total = d.mode === 'kwitansi' ? d.amount : sum.total
  const words = total > 0 ? amountWords(total) : ''

  const setItem = (id: number, patch: Partial<Item>) => set('items', d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const addItem = () => set('items', [...d.items, { id: Math.max(0, ...d.items.map((i) => i.id)) + 1, name: '', qty: 1, price: 0 }])

  async function download() {
    setError(null)
    if (total <= 0) return setError(t('Isi nominal atau harga item dulu.', 'Enter an amount or item prices first.'))
    setBusy(true)
    try {
      const name = `${d.mode}-${d.number || 'dokumen'}`.replace(/[\\/:*?"<>|\s]+/g, '-')
      downloadBlob(await buildPdf(d), `${name}.pdf`)
    } catch {
      setError(t('PDF gagal dibuat. Coba lagi.', 'The PDF could not be made. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  const field = (label: string, el: React.ReactNode) => (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      {el}
    </label>
  )
  const text = (k: 'number' | 'fromName' | 'toName' | 'place' | 'signer', label: string, ph = '') =>
    field(label, <input value={d[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className={inputCls} />)
  const area = (k: 'fromAddress' | 'toAddress' | 'purpose' | 'notes', label: string) =>
    field(label, <textarea rows={2} value={d[k]} onChange={(e) => set(k, e.target.value)} className={inputCls} />)

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Jenis dokumen', 'Document type')}
        value={d.mode}
        onChange={(m) => set('mode', m)}
        options={[
          { value: 'kwitansi', label: t('Kwitansi', 'Receipt') },
          { value: 'invoice', label: 'Invoice' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {text('number', t('Nomor', 'Number'))}
        {field(t('Tanggal', 'Date'), <input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />)}
        {text('fromName', d.mode === 'kwitansi' ? t('Penerima uang (nama/usaha)', 'Payee (name/business)') : t('Dari (nama/usaha)', 'From (name/business)'))}
        {area('fromAddress', t('Alamat / kontak', 'Address / contact'))}
        {text('toName', d.mode === 'kwitansi' ? t('Telah terima dari', 'Received from') : t('Ditagihkan kepada', 'Bill to'))}
        {d.mode === 'invoice' && area('toAddress', t('Alamat pelanggan', 'Customer address'))}
      </div>

      {d.mode === 'kwitansi' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            t('Jumlah uang (Rp)', 'Amount (Rp)'),
            <input
              inputMode="numeric"
              value={d.amount ? new Intl.NumberFormat('id-ID').format(d.amount) : ''}
              onChange={(e) => set('amount', amountFromInput(e.target.value))}
              placeholder="1.250.000"
              className={inputCls + ' text-lg font-semibold tabular-nums'}
            />,
          )}
          {area('purpose', t('Untuk pembayaran', 'For payment of'))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">{t('Item', 'Items')}</p>
          {d.items.map((i) => (
            <div key={i.id} className="grid grid-cols-[1fr_4.5rem_8rem_auto] items-center gap-2">
              <input aria-label={t('Nama item', 'Item name')} value={i.name} onChange={(e) => setItem(i.id, { name: e.target.value })} placeholder={t('Nama item', 'Item name')} className={inputCls} />
              <input aria-label={t('Jumlah', 'Qty')} inputMode="numeric" value={i.qty || ''} onChange={(e) => setItem(i.id, { qty: amountFromInput(e.target.value) })} placeholder="1" className={inputCls + ' text-right'} />
              <input
                aria-label={t('Harga satuan', 'Unit price')}
                inputMode="numeric"
                value={i.price ? new Intl.NumberFormat('id-ID').format(i.price) : ''}
                onChange={(e) => setItem(i.id, { price: amountFromInput(e.target.value) })}
                placeholder={t('Harga', 'Price')}
                className={inputCls + ' text-right'}
              />
              <Button variant="ghost" size="icon" aria-label={t('Hapus item', 'Remove item')} disabled={d.items.length === 1} onClick={() => set('items', d.items.filter((x) => x.id !== i.id))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus />
            {t('Tambah item', 'Add item')}
          </Button>
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              t('Diskon (Rp)', 'Discount (Rp)'),
              <input inputMode="numeric" value={d.discount ? new Intl.NumberFormat('id-ID').format(d.discount) : ''} onChange={(e) => set('discount', amountFromInput(e.target.value))} className={inputCls} />,
            )}
            {field(
              t('Pajak (%) — mis. PPN 11', 'Tax (%) — e.g. VAT 11'),
              <input inputMode="decimal" value={d.taxPercent || ''} onChange={(e) => set('taxPercent', Math.min(100, Number(e.target.value.replace(',', '.')) || 0))} className={inputCls} />,
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {area('notes', t('Catatan (opsional)', 'Notes (optional)'))}
        <div className="space-y-4">
          {text('place', t('Kota', 'City'))}
          {text('signer', t('Nama penanda tangan', 'Signer name'))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border bg-muted/40 p-4">
        {d.mode === 'invoice' && (
          <p className="text-sm text-muted-foreground">
            Subtotal {rupiahText(sum.subtotal)}
            {sum.discount ? ` · ${t('Diskon', 'Discount')} ${rupiahText(sum.discount)}` : ''}
            {sum.tax ? ` · ${t('Pajak', 'Tax')} ${rupiahText(sum.tax)}` : ''}
          </p>
        )}
        <p className="text-xl font-semibold tabular-nums">{rupiahText(total)}</p>
        {words && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">{words}</p>
            <CopyButton text={words} />
          </div>
        )}
      </div>

      {error && <ErrorNote message={error} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void download()} disabled={busy}>
          <Download />
          {t('Unduh PDF', 'Download PDF')}
        </Button>
        <Button variant="ghost" onClick={() => setD({ ...blank(), fromName: d.fromName, fromAddress: d.fromAddress, place: d.place, signer: d.signer, mode: d.mode })}>
          {t('Dokumen baru', 'New document')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'Data terakhir tersimpan di browser ini supaya tidak perlu mengetik ulang; tidak dikirim ke mana pun. “Dokumen baru” menyimpan data pengirim dan mengosongkan sisanya. Tempel meterai/tanda tangan manual setelah dicetak.',
          'Your last entry is kept in this browser so you don’t retype it; nothing is sent anywhere. “New document” keeps the sender details and clears the rest. Add the stamp duty/signature by hand after printing.',
        )}
      </p>
    </div>
  )
}
