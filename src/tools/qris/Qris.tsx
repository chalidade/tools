import { useEffect, useMemo, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { canvasBlob } from '@/lib/image'
import { locale, useT } from '@/lib/i18n'
import { qrMatrix, toCanvas, toSvg, type QrMatrix, type RenderOptions } from '@/tools/qr/render'
import { scanFile } from '@/tools/qr/scan'
import { CameraScanner } from '@/tools/qr/QrReader'
import { NotQrisError, parseAmount, readQris, withAmount, type QrisInfo } from './qris'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
const RENDER: RenderOptions = { fg: '#000000', bg: '#ffffff', margin: 4, style: 'square', logo: null }

type Source = 'image' | 'camera'

export default function Qris() {
  const t = useT()
  const [source, setSource] = useState<Source>('image')
  const [info, setInfo] = useState<QrisInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function accept(text: string) {
    try {
      setInfo(readQris(text))
      setError(null)
    } catch (e) {
      setInfo(null)
      setError(e instanceof NotQrisError ? e.message : t('Kode tidak bisa dibaca.', 'The code can’t be read.'))
    }
  }

  async function readFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const found = await scanFile(file)
      if (!found.length)
        setError(t('Tidak ada QR code yang terbaca. Pastikan QRIS utuh dan tajam.', 'No QR code could be read. Make sure the QRIS is whole and sharp.'))
      else accept(found[0].text)
    } catch {
      setError(t('Gambar tidak bisa dibaca. Coba JPG, PNG, atau WebP.', 'The image can’t be read. Try JPG, PNG, or WebP.'))
    } finally {
      setBusy(false)
    }
  }

  // Paste a screenshot of the QRIS straight from the clipboard.
  useEffect(() => {
    if (info) return
    function onPaste(e: ClipboardEvent) {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) void readFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [info])

  if (info) return <Builder info={info} onAgain={() => setInfo(null)} />

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Sumber QRIS', 'QRIS source')}
        value={source}
        options={[
          { value: 'image', label: t('Dari gambar', 'From image') },
          { value: 'camera', label: t('Kamera', 'Camera') },
        ]}
        onChange={(s) => {
          setSource(s)
          setError(null)
        }}
      />
      {source === 'image' ? (
        <div className="space-y-3">
          <FileDrop
            accept="image/*"
            label={t('Tarik gambar QRIS toko ke sini', 'Drag your shop’s QRIS image here')}
            busyLabel={busy ? t('Membaca QRIS…', 'Reading QRIS…') : undefined}
            onFiles={([f]) => void readFile(f)}
          />
          <p className="text-center text-xs text-muted-foreground">
            {t('Atau tempel screenshot dari clipboard (Ctrl/⌘ + V).', 'Or paste a screenshot from the clipboard (Ctrl/⌘ + V).')}
          </p>
        </div>
      ) : (
        <CameraScanner onFound={(scan) => accept(scan.text)} />
      )}
      {error && <ErrorNote message={error} />}
      <p className="text-xs text-muted-foreground">
        {t(
          'QRIS dibaca dan dibuat ulang di perangkat ini; tidak ada yang dikirim ke server mana pun. Pakai QRIS tokomu sendiri.',
          'The QRIS is read and rebuilt on this device; nothing is sent to any server. Use your own shop’s QRIS.',
        )}
      </p>
    </div>
  )
}

function Builder({ info, onAgain }: { info: QrisInfo; onAgain: () => void }) {
  const t = useT()
  const [raw, setRaw] = useState('')
  const amount = parseAmount(raw)
  const text = useMemo(() => (amount ? withAmount(info, amount) : null), [info, amount])
  const [matrix, setMatrix] = useState<QrMatrix | null>(null)

  useEffect(() => {
    let live = true
    if (!text) return setMatrix(null)
    void qrMatrix(text, 'M').then((m) => live && setMatrix(m))
    return () => {
      live = false
    }
  }, [text])

  const svg = matrix ? toSvg(matrix, RENDER) : ''
  const rupiah = amount ? new Intl.NumberFormat(locale(), { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(amount)) : ''
  const fileName = `qris-${amount ?? 'nominal'}`

  async function png() {
    if (matrix) downloadBlob(await canvasBlob(await toCanvas(matrix, RENDER, 1024)), `${fileName}.png`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4">
        <div>
          <p className="font-medium">{info.merchant || t('(tanpa nama merchant)', '(no merchant name)')}</p>
          <p className="text-sm text-muted-foreground">
            {info.city} · {info.dynamic ? t('QRIS dinamis', 'Dynamic QRIS') : t('QRIS statis', 'Static QRIS')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onAgain}>
          <RotateCcw />
          {t('Ganti QRIS', 'Another QRIS')}
        </Button>
      </div>

      {!info.crcOk && (
        <ErrorNote
          message={t(
            'Checksum (CRC) QRIS ini tidak cocok, mungkin salah baca atau sudah diubah. QR baru tetap dibuat dengan checksum yang benar, tapi periksa hasilnya.',
            'This QRIS’s checksum (CRC) does not match — it may be misread or altered. The new QR gets a correct checksum, but check the result.',
          )}
        />
      )}
      {info.amount && (
        <p className="text-sm text-muted-foreground">
          {t(`QRIS ini sudah memuat nominal ${info.amount}; akan diganti.`, `This QRIS already holds the amount ${info.amount}; it will be replaced.`)}
        </p>
      )}

      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        {t('Nominal (rupiah)', 'Amount (rupiah)')}
        <input inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="25.000" className={inputCls + ' text-2xl font-semibold tabular-nums'} />
      </label>
      {raw.trim() && !amount && (
        <p className="text-sm text-destructive">{t('Isi nominal lebih dari 0, mis. 25.000 atau 25000.', 'Enter an amount above 0, e.g. 25,000 or 25000.')}</p>
      )}

      {matrix && (
        <div className="space-y-3 text-center">
          <div className="mx-auto w-72 max-w-full overflow-hidden rounded-2xl border bg-white p-1" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="font-semibold tabular-nums">{rupiah}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => void png()}>
              <Download />
              {t('Unduh PNG', 'Download PNG')}
            </Button>
            <Button variant="outline" onClick={() => downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${fileName}.svg`)}>
              <Download />
              SVG
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          'Kode berisi data merchant yang sama, ditambah nominal dan CRC baru. Coba pindai dengan satu aplikasi pembayaran sebelum dipakai ke pelanggan.',
          'The code holds the same merchant data plus the amount and a new CRC. Scan it once with a payment app before giving it to a customer.',
        )}
      </p>
    </div>
  )
}
