import { useState } from 'react'
import { Check, Download, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { cn } from '@/lib/utils'
import {
  buildPdf,
  pageFor,
  readSpreadsheet,
  type Orientation,
  type PageSize,
  type PdfOptions,
  type Sheet,
  type Spreadsheet,
} from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; book: Spreadsheet }
  | { kind: 'exporting'; book: Spreadsheet; done: number; total: number }
  | { kind: 'error'; message: string }

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const ACCEPT = `.xlsx,.xlsm,.csv,.xls,.ods,${XLSX_MIME},text/csv`

/** Rows shown in the on-page preview; the PDF always has all of them. */
const PREVIEW_ROWS = 200

const PAGE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
]
const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'portrait', label: 'Potret' },
  { value: 'landscape', label: 'Lanskap' },
]
const FIT_OPTIONS: { value: 'fit' | 'actual'; label: string }[] = [
  { value: 'fit', label: 'Muat lebar halaman' },
  { value: 'actual', label: 'Ukuran asli' },
]
const GRID_OPTIONS: { value: 'on' | 'off'; label: string }[] = [
  { value: 'on', label: 'Tampil' },
  { value: 'off', label: 'Sembunyi' },
]

export default function ExcelToPdf() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [opts, setOpts] = useState<PdfOptions>({ page: 'a4', orientation: 'auto', fitWidth: true, gridlines: true })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [active, setActive] = useState(0)

  async function open(next: File) {
    if (/\.(xls|ods)$/i.test(next.name)) {
      setStatus({
        kind: 'error',
        message: `Format ${next.name.split('.').pop()} belum didukung. Buka di Excel/LibreOffice, simpan sebagai .xlsx, lalu coba lagi.`,
      })
      return
    }
    if (!/\.(xlsx|xlsm|csv)$/i.test(next.name) && next.type !== XLSX_MIME && next.type !== 'text/csv') {
      setStatus({ kind: 'error', message: 'Pilih file Excel (.xlsx) atau CSV.' })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      const book = await readSpreadsheet(next)
      setSelected(new Set(book.sheets.map((_, i) => i)))
      setActive(0)
      setStatus({ kind: 'ready', book })
    } catch {
      setStatus({
        kind: 'error',
        message: 'File tidak bisa dibaca, atau semua sheet-nya kosong. Pastikan file tidak rusak atau terkunci password.',
      })
    }
  }

  async function exportPdf(book: Spreadsheet) {
    if (!file) return
    const sheets = book.sheets.filter((_, i) => selected.has(i))
    setStatus({ kind: 'exporting', book, done: 0, total: sheets.length })
    try {
      const blob = await buildPdf(sheets, opts, (done, total) => setStatus({ kind: 'exporting', book, done, total }))
      downloadBlob(blob, withExtension(file.name, '.pdf'))
      setStatus({ kind: 'ready', book })
    } catch {
      setStatus({ kind: 'error', message: 'Gagal membuat PDF. Coba file yang lebih kecil.' })
    }
  }

  if (status.kind === 'ready' || status.kind === 'exporting') {
    const { book } = status
    const busy = status.kind === 'exporting'
    const sheet = book.sheets[active]
    const multi = book.sheets.length > 1

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy
                ? `Membuat PDF… sheet ${status.done}/${status.total}`
                : `${book.sheets.length} sheet · ${selected.size} dipilih`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void exportPdf(book)} disabled={busy || selected.size === 0}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              Unduh PDF
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              File lain
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label="Ukuran kertas"
            value={opts.page}
            options={PAGE_OPTIONS}
            disabled={busy}
            onChange={(page) => setOpts((o) => ({ ...o, page }))}
          />
          <Segmented
            label="Orientasi"
            value={opts.orientation}
            options={ORIENTATION_OPTIONS}
            disabled={busy}
            onChange={(orientation) => setOpts((o) => ({ ...o, orientation }))}
          />
          <Segmented
            label="Skala"
            value={opts.fitWidth ? 'fit' : 'actual'}
            options={FIT_OPTIONS}
            disabled={busy}
            onChange={(v) => setOpts((o) => ({ ...o, fitWidth: v === 'fit' }))}
          />
          <Segmented
            label="Garis bantu"
            value={opts.gridlines ? 'on' : 'off'}
            options={GRID_OPTIONS}
            disabled={busy}
            onChange={(v) => setOpts((o) => ({ ...o, gridlines: v === 'on' }))}
          />
        </div>

        {multi && (
          <div className="space-y-2 rounded-2xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Sheet yang dimasukkan ke PDF</p>
            <div className="flex flex-wrap gap-2">
              {book.sheets.map((s, i) => {
                const on = selected.has(i)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={busy}
                    aria-pressed={on}
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (next.has(i)) next.delete(i)
                        else next.add(i)
                        return next
                      })
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                      on ? 'border-brand-2/40 bg-brand-2/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-4 place-items-center rounded border',
                        on ? 'border-transparent bg-gradient-brand text-white' : 'bg-background',
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <SheetPreview sheets={book.sheets} active={active} onActive={setActive} sheet={sheet} opts={opts} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept={ACCEPT}
        label="Tarik file .xlsx atau .csv ke sini"
        busyLabel={status.kind === 'reading' ? `Membaca ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}

function SheetPreview({
  sheets,
  active,
  onActive,
  sheet,
  opts,
}: {
  sheets: Sheet[]
  active: number
  onActive: (i: number) => void
  sheet: Sheet
  opts: PdfOptions
}) {
  const { landscape, scale } = pageFor(sheet, opts)
  const rows = sheet.rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between gap-4 border-b bg-muted px-2">
        <div className="flex overflow-x-auto">
          {sheets.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onActive(i)}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2 text-xs transition-colors',
                i === active ? 'border-brand-2 font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        <p className="shrink-0 pr-2 font-mono text-[11px] text-muted-foreground">
          {landscape ? 'lanskap' : 'potret'}
          {scale < 1 && ` · ${Math.round(scale * 100)}%`}
        </p>
      </div>

      <div className="max-h-[32rem] overflow-auto bg-white p-4 text-[#111]">
        <table className="border-collapse" style={{ tableLayout: 'fixed', width: sheet.colWidths.reduce((a, b) => a + b, 0) + 'pt' }}>
          <colgroup>
            {sheet.colWidths.map((w, i) => (
              <col key={i} style={{ width: `${w}pt` }} />
            ))}
          </colgroup>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} style={{ height: sheet.rowHeights[r] ? `${sheet.rowHeights[r]}pt` : undefined }}>
                {row.map((cell, c) => {
                  if (cell.covered) return null
                  const s = cell.style
                  const grid = opts.gridlines ? '1px solid #e4e4e7' : '1px solid transparent'
                  const edge = (on: boolean) => (on ? '1px solid #3f3f46' : grid)
                  return (
                    <td
                      key={c}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      style={{
                        padding: '2pt 3pt',
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontSize: `${s.size}pt`,
                        fontWeight: s.bold ? 700 : 400,
                        fontStyle: s.italic ? 'italic' : undefined,
                        textDecoration: s.underline ? 'underline' : undefined,
                        color: s.color,
                        background: s.fill,
                        textAlign: s.align,
                        verticalAlign: s.valign,
                        whiteSpace: s.wrap ? 'pre-wrap' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        borderTop: edge(s.border.top),
                        borderRight: edge(s.border.right),
                        borderBottom: edge(s.border.bottom),
                        borderLeft: edge(s.border.left),
                      }}
                    >
                      {cell.text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet.rows.length > PREVIEW_ROWS && (
          <p className="mt-3 text-xs text-neutral-500">
            Pratinjau menampilkan {PREVIEW_ROWS} dari {sheet.rows.length} baris. PDF memuat semuanya.
          </p>
        )}
      </div>
    </div>
  )
}
