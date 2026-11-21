import { useMemo, useState } from 'react'
import { LayoutGrid, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { openErrorMessage, pageThumbs } from '@/lib/pdf-doc'
import { cellRects, isPdfFile, nupPdf, sheetSize, sides, type Layout, type NupOptions, type Paper } from './nup'

type Option<V> = { value: V; label: readonly [string, string] }

const LAYOUTS: Option<Layout>[] = [
  { value: '2', label: ['2 per lembar', '2 per sheet'] },
  { value: '4', label: ['4 per lembar', '4 per sheet'] },
  { value: '8', label: ['8 per lembar', '8 per sheet'] },
  { value: 'booklet', label: ['Buku (lipat)', 'Booklet (fold)'] },
]
const PAPERS: Option<Paper>[] = [
  { value: 'a4', label: ['A4', 'A4'] },
  { value: 'f4', label: ['F4 (215 × 330)', 'F4 (215 × 330)'] },
  { value: 'letter', label: ['Letter', 'Letter'] },
]

export default function PdfNUp() {
  const t = useT()
  const opt = <V,>(list: Option<V>[]) => list.map((o) => ({ value: o.value, label: t(...o.label) }))
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState(0)
  const [opening, setOpening] = useState(false)
  const [opts, setOpts] = useState<NupOptions>({ layout: '2', paper: 'a4', border: true })
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof NupOptions>(key: K, value: NupOptions[K]) => setOpts((o) => ({ ...o, [key]: value }))

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setError(t('Pilih file berformat .pdf.', 'Choose a .pdf file.'))
      return
    }
    setError(null)
    setOpening(true)
    try {
      // Only the count is needed; render one tiny thumbnail to read it (this also rejects locked or broken files).
      const { count } = await pageThumbs(next, 32, undefined, [1])
      setFile(next)
      setPages(count)
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setOpening(false)
    }
  }

  async function save() {
    if (!file) return
    setError(null)
    setProgress({ done: 0, total: 0 })
    try {
      const blob = await nupPdf(file, opts, (done, total) => setProgress({ done, total }))
      downloadBlob(blob, file.name.replace(/\.pdf$/i, '') + t('-hemat.pdf', '-nup.pdf'))
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  const plan = useMemo(() => sides(pages, opts.layout), [pages, opts.layout])
  const cells = useMemo(() => cellRects(opts), [opts])
  const size = sheetSize(opts)

  if (file) {
    const busy = progress !== null
    const booklet = opts.layout === 'booklet'
    const sheets = booklet ? plan.length / 2 : plan.length
    const preview = plan.slice(0, 2)
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy && progress.total
                ? t(`Menyusun… lembar ${progress.done}/${progress.total}`, `Arranging… sheet ${progress.done}/${progress.total}`)
                : t(`${pages} halaman → ${sheets} lembar kertas.`, `${pages} pages → ${sheets} sheets of paper.`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <LayoutGrid />}
              {t('Susun & unduh', 'Arrange & download')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setFile(null)}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-5 rounded-2xl border bg-card p-5">
            <Segmented label={t('Susunan', 'Layout')} value={opts.layout} options={opt(LAYOUTS)} disabled={busy} onChange={(v) => set('layout', v)} />
            <Segmented label={t('Ukuran kertas', 'Paper size')} value={opts.paper} options={opt(PAPERS)} disabled={busy} onChange={(v) => set('paper', v)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={opts.border} disabled={busy} onChange={(e) => set('border', e.target.checked)} />
              {t('Garis tipis di sekeliling tiap halaman', 'Thin outline around each page')}
            </label>
            <p className="text-xs text-muted-foreground">
              {booklet
                ? t(
                    'Cetak bolak-balik (balik di sisi pendek), lalu lipat dua tumpukannya jadi buku. Jumlah halaman dibulatkan ke kelipatan 4 dengan halaman kosong.',
                    'Print double-sided (flip on the short edge), then fold the stack in half to make a book. The page count is rounded up to a multiple of 4 with blank pages.',
                  )
                : t(
                    'Halaman diperkecil agar muat dan tetap berupa teks, jadi tetap tajam. Halaman yang berbeda ukuran diratakan di tengah kotaknya.',
                    'Pages are scaled to fit and stay real text, so they stay sharp. Pages of other sizes are centred in their cell.',
                  )}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {booklet ? t('Pratinjau lembar 1 (depan, belakang)', 'Sheet 1 preview (front, back)') : t('Pratinjau lembar 1', 'Sheet 1 preview')}
            </p>
            <div className="flex flex-wrap items-start justify-center gap-3 rounded-2xl border bg-muted/60 p-4">
              {preview.slice(0, booklet ? 2 : 1).map((side, i) => (
                <svg
                  key={i}
                  viewBox={`0 0 ${size.w} ${size.h}`}
                  className="w-full max-w-[16rem] bg-white shadow-md ring-1 ring-black/5"
                  style={{ flex: '1 1 12rem' }}
                  role="img"
                  aria-label={t('Susunan halaman pada lembar', 'Page arrangement on the sheet')}
                >
                  {cells.map((c, k) => (
                    <g key={k}>
                      <rect x={c.x} y={size.h - c.y - c.h} width={c.w} height={c.h} fill={side[k] === null ? '#f4f4f5' : '#e4e4e7'} stroke="#a1a1aa" strokeWidth={1.5} />
                      <text
                        x={c.x + c.w / 2}
                        y={size.h - c.y - c.h / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={Math.min(c.w, c.h) / 3}
                        fill="#52525b"
                        fontFamily="sans-serif"
                      >
                        {side[k] === null ? '' : side[k]! + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              ))}
            </div>
          </div>
        </div>

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')}
        busyLabel={opening ? t('Membuka PDF…', 'Opening PDF…') : undefined}
        onFiles={([f]) => void open(f)}
      />
      {error && <ErrorNote message={error} />}
    </div>
  )
}
