import { useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { TextFileButton } from '@/components/tool/TextFileButton'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { LAYOUTS, labelSize, parseRecipients, type Recipient, type Sender } from './labels'
import { buildLabels } from './pdf'

const KEY = 'tools.label-pengiriman'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const blankSender = (): Sender => ({ name: '', phone: '', address: '' })
const blankRow = (id: number): Recipient => ({ id, name: '', phone: '', address: '', resi: '', contents: '' })

// Only the sender is kept on this device; recipients are other people's data.
function loadSender(): Sender {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object') return { ...blankSender(), ...s }
  } catch {
    /* storage blocked or empty */
  }
  return blankSender()
}

export default function LabelPengiriman() {
  const t = useT()
  const [sender, setSender] = useState(loadSender)
  const [rows, setRows] = useState<Recipient[]>([blankRow(1)])
  const [paste, setPaste] = useState('')
  const [layoutId, setLayoutId] = useState('a4-2x4')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(sender))
    } catch {
      /* storage blocked */
    }
  }, [sender])

  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0]
  const [lw, lh] = labelSize(layout)
  const nextId = () => Math.max(0, ...rows.map((r) => r.id)) + 1
  const filled = rows.filter((r) => r.name.trim() || r.address.trim())
  const perSheet = layout.cols * layout.rows
  const sheets = Math.ceil(filled.length / perSheet)

  const patch = (id: number, p: Partial<Recipient>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)))

  function addText(text: string) {
    const added = parseRecipients(text, nextId())
    if (!added.length) return setError(t('Tidak ada baris yang terbaca. Urutan kolom: nama, telepon, alamat, no. resi, isi paket.', 'No rows could be read. Column order: name, phone, address, tracking no., contents.'))
    setError(null)
    // Replace the untouched blank starter row instead of leaving it at the top.
    setRows((rs) => [...rs.filter((r) => r.name || r.address || r.phone), ...added])
    setPaste('')
  }

  async function download() {
    setError(null)
    if (!filled.length) return setError(t('Isi minimal satu penerima dulu.', 'Add at least one recipient first.'))
    setBusy(true)
    try {
      downloadBlob(await buildLabels(sender, filled, layout), 'label-pengiriman.pdf')
    } catch {
      setError(t('PDF gagal dibuat. Coba lagi.', 'The PDF could not be made. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('1. Pengirim (tersimpan di perangkat)', '1. Sender (kept on this device)')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input aria-label={t('Nama pengirim', 'Sender name')} placeholder={t('Nama pengirim / toko', 'Sender / shop name')} value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} className={inputCls} />
          <input aria-label={t('Telepon pengirim', 'Sender phone')} inputMode="tel" placeholder={t('No. telepon', 'Phone')} value={sender.phone} onChange={(e) => setSender({ ...sender, phone: e.target.value })} className={inputCls} />
          <textarea aria-label={t('Alamat pengirim', 'Sender address')} rows={2} placeholder={t('Alamat pengirim', 'Sender address')} value={sender.address} onChange={(e) => setSender({ ...sender, address: e.target.value })} className={inputCls + ' sm:col-span-2'} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('2. Penerima', '2. Recipients')}</h2>
        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {t(
              'Tempel dari Excel atau CSV, satu penerima per baris. Kolom: nama, telepon, alamat, no. resi (opsional), isi paket (opsional).',
              'Paste from Excel or CSV, one recipient per row. Columns: name, phone, address, tracking no. (optional), contents (optional).',
            )}
          </p>
          <textarea aria-label={t('Tempel data penerima', 'Paste recipient data')} rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} className={inputCls + ' font-mono text-xs'} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!paste.trim()} onClick={() => addText(paste)}>
              <Plus />
              {t('Tambahkan', 'Add')}
            </Button>
            <TextFileButton accept=".csv,.tsv,.txt,text/csv,text/plain" onText={(text) => addText(text)} />
          </div>
        </div>

        {rows.map((r, n) => (
          <div key={r.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">
            <input aria-label={t('Nama penerima', 'Recipient name')} placeholder={`${n + 1}. ${t('Nama penerima', 'Recipient name')}`} value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} className={inputCls} />
            <input aria-label={t('Telepon penerima', 'Recipient phone')} inputMode="tel" placeholder={t('No. telepon', 'Phone')} value={r.phone} onChange={(e) => patch(r.id, { phone: e.target.value })} className={inputCls} />
            <textarea aria-label={t('Alamat penerima', 'Recipient address')} rows={2} placeholder={t('Alamat lengkap', 'Full address')} value={r.address} onChange={(e) => patch(r.id, { address: e.target.value })} className={inputCls + ' sm:col-span-2'} />
            <input aria-label={t('No. resi', 'Tracking no.')} placeholder={t('No. resi (opsional)', 'Tracking no. (optional)')} value={r.resi} onChange={(e) => patch(r.id, { resi: e.target.value })} className={inputCls} />
            <div className="flex gap-2">
              <input aria-label={t('Isi paket', 'Contents')} placeholder={t('Isi paket (opsional)', 'Contents (optional)')} value={r.contents} onChange={(e) => patch(r.id, { contents: e.target.value })} className={inputCls} />
              <Button variant="ghost" size="icon" aria-label={t('Hapus penerima', 'Remove recipient')} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, blankRow(nextId())])}>
          <Plus />
          {t('Tambah penerima', 'Add recipient')}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t('3. Ukuran label', '3. Label size')}</h2>
        <select aria-label={t('Ukuran label', 'Label size')} value={layoutId} onChange={(e) => setLayoutId(e.target.value)} className={inputCls}>
          {LAYOUTS.map((l) => (
            <option key={l.id} value={l.id}>
              {t(l.label[0], l.label[1])}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {t('Tiap label', 'Each label')} {lw.toFixed(0)} × {lh.toFixed(0)} mm · {filled.length} {t('penerima', 'recipients')}
          {filled.length > 0 && ` · ${sheets} ${t('halaman', 'pages')}`}.{' '}
          {t(
            'Tata letak A4 membagi kertas rata; cetak dengan skala 100% ("Actual size"). Ukur dulu stiker kertasmu: bila ukurannya beda, cetak di kertas biasa lalu gunting.',
            'A4 layouts split the sheet evenly; print at 100% ("Actual size"). Measure your sticker sheet first: if it differs, print on plain paper and cut.',
          )}
        </p>
      </section>

      {error && <ErrorNote message={error} />}
      <Button onClick={() => void download()} disabled={busy}>
        <Download />
        {t('Unduh PDF', 'Download PDF')}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t(
          'Hanya data pengirim yang tersimpan di browser ini; data penerima hilang saat halaman ditutup. Tidak ada yang dikirim ke mana pun.',
          'Only the sender details are kept in this browser; recipient data is gone when you close the page. Nothing is sent anywhere.',
        )}
      </p>
    </div>
  )
}
