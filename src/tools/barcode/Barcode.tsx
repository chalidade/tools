import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { canvasBlob, newCanvas } from '@/lib/image'
import { drawBarcode, drawingToSvg, encodeBarcode, parseLines, TYPES, type BarcodeType, type Drawing, type EncodeResult } from './barcode'
import { buildSheet, SHEETS, sheetLabels } from './sheet'

const SAMPLE: Record<BarcodeType, string> = {
  ean13: '5901234123457',
  ean8: '96385074',
  upca: '036000291452',
  code128: 'TOKO-0001',
  code39: 'TOKO-0001',
}

function paint(canvas: HTMLCanvasElement, d: Drawing) {
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  for (const r of d.rects) ctx.fillRect(r.x, r.y, r.w, r.h)
  for (const x of d.texts) {
    ctx.font = `${x.size}px Helvetica, Arial, sans-serif`
    ctx.textAlign = x.anchor === 'middle' ? 'center' : x.anchor === 'end' ? 'right' : 'left'
    ctx.fillText(x.s, x.x, x.y)
  }
}

export default function Barcode() {
  const t = useT()
  const [type, setType] = useState<BarcodeType>('ean13')
  const [input, setInput] = useState(SAMPLE.ean13)
  const [mod, setMod] = useState(3)
  const [height, setHeight] = useState(90)
  const [showText, setShowText] = useState(true)
  const [copies, setCopies] = useState(1)
  const [sheetId, setSheetId] = useState(SHEETS[1].id)
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const lines = useMemo(() => parseLines(input), [input])
  const results = useMemo(() => lines.map((l) => ({ line: l, res: encodeBarcode(type, l) })), [lines, type])
  const first = results[0]?.res
  const bad = results.filter((r) => !r.res.ok)
  const valid = results.length - bad.length
  const opts = { module: mod, height, showText, quiet: 10 }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !first?.ok) return
    const d = drawBarcode(first.code, opts)
    canvas.width = Math.ceil(d.width)
    canvas.height = Math.ceil(d.height)
    paint(canvas, d)
  })

  function reason(r: EncodeResult): string {
    if (r.ok) return ''
    switch (r.error) {
      case 'empty': return t('Isi nomornya dulu.', 'Enter a value first.')
      case 'digits': return t('Hanya boleh angka.', 'Digits only.')
      case 'length': return t(`Harus ${r.expected! - 1} angka (tanpa digit cek) atau ${r.expected} angka.`, `Needs ${r.expected! - 1} digits (no check digit) or ${r.expected}.`)
      case 'check': return t(`Digit cek salah — seharusnya ${r.check}.`, `Wrong check digit — it should be ${r.check}.`)
      case 'chars':
        return type === 'code39'
          ? t('Code 39 hanya huruf A–Z, angka, dan - . $ / + % dan spasi.', 'Code 39 allows A–Z, digits and - . $ / + % and space.')
          : t('Code 128 di sini hanya untuk karakter ASCII biasa.', 'Code 128 here takes plain ASCII characters only.')
    }
  }

  function pick(next: BarcodeType) {
    // Swap the sample only if the box still holds another type's sample.
    if (Object.values(SAMPLE).includes(input)) setInput(SAMPLE[next])
    setType(next)
  }

  function svg() {
    if (!first?.ok) return
    downloadBlob(new Blob([drawingToSvg(drawBarcode(first.code, opts))], { type: 'image/svg+xml' }), `barcode-${type}-${first.code.text.replace(/[^\w-]+/g, '_')}.svg`)
  }

  async function png() {
    if (!first?.ok) return
    const d = drawBarcode(first.code, opts)
    const canvas = newCanvas(d.width, d.height)
    paint(canvas, d)
    downloadBlob(await canvasBlob(canvas, 'image/png'), `barcode-${type}-${first.code.text.replace(/[^\w-]+/g, '_')}.png`)
  }

  async function sheet() {
    setBusy(true)
    try {
      const layout = SHEETS.find((s) => s.id === sheetId)!
      downloadBlob(await buildSheet({ type, values: lines, copies, layout, showText }), 'label-barcode.pdf')
    } finally {
      setBusy(false)
    }
  }

  const total = sheetLabels({ type, values: lines, copies }).length
  const hint = type === 'code39' || type === 'code128'
    ? t('Satu nomor per baris.', 'One value per line.')
    : t('Satu nomor per baris. Tanpa digit cek pun boleh — dihitung otomatis.', 'One number per line. The check digit is optional — it is added for you.')

  return (
    <div className="space-y-6">
      <Segmented label={t('Jenis barcode', 'Barcode type')} value={type} options={TYPES} onChange={pick} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Isi barcode', 'Barcode value')}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm text-foreground"
            />
          </label>
          <p className="text-xs text-muted-foreground">{hint}</p>
          {first && !first.ok && <ErrorNote message={reason(first)} />}
          {bad.length > 0 && first?.ok && (
            <ErrorNote message={t(`${bad.length} baris tidak valid dan dilewati di lembar label: ${bad.slice(0, 3).map((b) => b.line).join(', ')}`, `${bad.length} lines are invalid and skipped on the label sheet: ${bad.slice(0, 3).map((b) => b.line).join(', ')}`)} />
          )}
          <div className="flex min-h-40 items-center justify-center overflow-x-auto rounded-2xl border bg-white p-4">
            {first?.ok ? <canvas ref={canvasRef} className="max-w-full" aria-label={t('Pratinjau barcode', 'Barcode preview')} /> : <p className="text-sm text-neutral-500">{t('Pratinjau muncul di sini.', 'The preview appears here.')}</p>}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Lebar modul', 'Module width')}: {mod} px
            <input type="range" min={1} max={8} value={mod} onChange={(e) => setMod(+e.target.value)} className="w-full" />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Tinggi batang', 'Bar height')}: {height} px
            <input type="range" min={30} max={240} step={5} value={height} onChange={(e) => setHeight(+e.target.value)} className="w-full" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
            {t('Tampilkan teks di bawah', 'Show the text below')}
          </label>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!first?.ok} onClick={() => void png()}>
              <Download />
              PNG
            </Button>
            <Button className="flex-1" variant="outline" disabled={!first?.ok} onClick={svg}>
              <Download />
              SVG
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{t('Lembar label siap cetak', 'Print-ready label sheet')}</h2>
        <div className="flex flex-wrap items-end gap-6">
          <Segmented label={t('Label per lembar A4', 'Labels per A4 sheet')} value={sheetId} options={SHEETS.map((s) => ({ value: s.id, label: s.label }))} onChange={setSheetId} />
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Salinan per baris', 'Copies per line')}
            <input type="number" min={1} max={200} value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(200, +e.target.value || 1)))} className="block w-24 rounded-lg border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
        </div>
        <Button disabled={busy || total === 0} onClick={() => void sheet()}>
          <FileText />
          {t(`Unduh PDF (${total} label)`, `Download PDF (${total} labels)`)}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t(
            `${valid} dari ${results.length} baris valid. Cetak dengan skala 100% pada kertas A4 (atau kertas stiker). Semua dibuat di perangkatmu.`,
            `${valid} of ${results.length} lines are valid. Print at 100% scale on A4 (or sticker paper). Everything is made on your device.`,
          )}
        </p>
      </div>
    </div>
  )
}
