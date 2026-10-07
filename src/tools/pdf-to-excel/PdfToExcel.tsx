import { useMemo, useState } from 'react'
import { Download, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { tr, useLang, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  assemble,
  buildXlsx,
  LockedPdfError,
  readPdf,
  ScannedPdfError,
  type AssembleOptions,
  type OutSheet,
  type PageText,
  type SheetMode,
} from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; pages: PageText[] }
  | { kind: 'error'; message: string }

/** Rows shown in the on-page preview; the .xlsx always has all of them. */
const PREVIEW_ROWS = 200

function errorMessage(e: unknown) {
  if (e instanceof ScannedPdfError)
    return tr(
      'PDF ini tidak berisi teks. Biasanya karena hasil scan atau foto, dan butuh OCR yang belum didukung tool ini.',
      "This PDF has no text. It's usually a scan or photo, which needs OCR — not supported by this tool yet.",
    )
  if (e instanceof LockedPdfError)
    return tr(
      'PDF ini dikunci password. Buka kuncinya dulu, lalu coba lagi.',
      'This PDF is password-protected. Unlock it first, then try again.',
    )
  return tr('PDF tidak bisa dibaca. Pastikan filenya tidak rusak.', "The PDF couldn't be read. Make sure the file isn't damaged.")
}

export default function PdfToExcel() {
  const t = useT()
  const lang = useLang()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [opts, setOpts] = useState<AssembleOptions>({ mode: 'merge', convertNumbers: true })
  const [active, setActive] = useState(0)
  const [saving, setSaving] = useState(false)

  const pages = status.kind === 'ready' ? status.pages : null
  // Re-assembling is pure and fast, so options apply instantly without re-reading the PDF.
  // `lang` is a dependency because assemble names the per-page sheets in the current language.
  const result = useMemo(() => (pages ? assemble(pages, opts) : null), [pages, opts, lang])

  const MODE_OPTIONS: { value: SheetMode; label: string }[] = [
    { value: 'merge', label: t('Gabung jadi satu', 'Merge into one') },
    { value: 'per-page', label: t('Satu per halaman', 'One per page') },
  ]
  const NUMBER_OPTIONS: { value: 'on' | 'off'; label: string }[] = [
    { value: 'on', label: t('Jadikan angka', 'Convert to numbers') },
    { value: 'off', label: t('Biarkan teks', 'Keep as text') },
  ]

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.') })
      return
    }
    setFile(next)
    setActive(0)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const read = await readPdf(next, (done, total) => setStatus({ kind: 'reading', done, total }))
      setStatus({ kind: 'ready', pages: read })
    } catch (e) {
      setStatus({ kind: 'error', message: errorMessage(e) })
    }
  }

  async function download() {
    if (!file || !result) return
    setSaving(true)
    try {
      downloadBlob(await buildXlsx(result), withExtension(file.name, '.xlsx'))
    } finally {
      setSaving(false)
    }
  }

  if (result && file) {
    const sheet = result.sheets[Math.min(active, result.sheets.length - 1)]
    const rowCount = result.sheets.reduce((n, s) => n + s.rows.length, 0)

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                `${result.pages} halaman · ${result.tables} tabel terdeteksi · ${rowCount} baris`,
                `${result.pages} pages · ${result.tables} tables detected · ${rowCount} rows`,
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Download />}
              {t('Unduh Excel', 'Download Excel')}
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label={t('Sheet', 'Sheets')}
            value={opts.mode}
            options={MODE_OPTIONS}
            onChange={(mode) => {
              setActive(0)
              setOpts((o) => ({ ...o, mode }))
            }}
          />
          <Segmented
            label={t('Angka', 'Numbers')}
            value={opts.convertNumbers ? 'on' : 'off'}
            options={NUMBER_OPTIONS}
            onChange={(v) => setOpts((o) => ({ ...o, convertNumbers: v === 'on' }))}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {t(
            'Kolom dibaca dari posisi teks di PDF. Angka seperti “Rp15.500.000” atau “12,5%” dijadikan angka sungguhan agar bisa langsung dihitung. Periksa hasilnya — tata letak yang rumit (kolom bertumpuk, tabel tanpa jarak) bisa tergabung kurang tepat.',
            'Columns are read from where the text sits in the PDF. Numbers like “Rp15.500.000” or “12,5%” become real numbers so you can calculate with them right away. Check the result — complex layouts (overlapping columns, tables with no spacing) may not merge quite right.',
          )}
        </p>

        {sheet && <Preview sheets={result.sheets} active={active} onActive={setActive} sheet={sheet} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drag a .pdf file here')}
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? t(`Membaca halaman ${status.done}/${status.total}…`, `Reading page ${status.done}/${status.total}…`)
              : t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`)
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}

const columnName = (i: number) => {
  let name = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

function Preview({
  sheets,
  active,
  onActive,
  sheet,
}: {
  sheets: OutSheet[]
  active: number
  onActive: (i: number) => void
  sheet: OutSheet
}) {
  const t = useT()
  const rows = sheet.rows.slice(0, PREVIEW_ROWS)
  const cols = Array.from({ length: sheet.columns }, (_, i) => i)

  return (
    <div className="overflow-hidden rounded-2xl border">
      {sheets.length > 1 && (
        <div className="flex overflow-x-auto border-b bg-muted px-2">
          {sheets.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onActive(i)}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2 text-xs transition-colors',
                i === active
                  ? 'border-brand-2 font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-[32rem] overflow-auto bg-white text-[13px] text-neutral-900">
        <table className="border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-10 border border-neutral-200 bg-neutral-100 px-2 py-1 font-normal text-neutral-500" />
              {cols.map((c) => (
                <th
                  key={c}
                  className="min-w-20 border border-neutral-200 bg-neutral-100 px-2 py-1 font-normal text-neutral-500"
                >
                  {columnName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <td className="border border-neutral-200 bg-neutral-100 px-2 py-1 text-right font-mono text-[11px] text-neutral-500">
                  {r + 1}
                </td>
                {!row.table ? (
                  // A loose text line: Excel lets it spill over the empty cells
                  // to its right, so it should not widen column A here either.
                  <td
                    colSpan={cols.length}
                    className={cn(
                      'border border-neutral-100 px-2 py-1 whitespace-nowrap',
                      row.cells[0]?.bold && 'font-semibold',
                    )}
                  >
                    {row.cells[0]?.text}
                  </td>
                ) : (
                  cols.map((c) => {
                    const cell = row.cells[c]
                    return (
                      <td
                        key={c}
                        className={cn(
                          'border border-neutral-300 px-2 py-1 whitespace-nowrap',
                          cell?.bold && 'font-semibold',
                          cell?.value !== undefined && 'text-right tabular-nums text-blue-700',
                        )}
                        title={cell?.value !== undefined ? t(`Angka: ${cell.value}`, `Number: ${cell.value}`) : undefined}
                      >
                        {cell?.text}
                      </td>
                    )
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted px-4 py-2 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-blue-600 dark:text-blue-400">{t('Biru', 'Blue')}</span>{' '}
          {t('= dibaca sebagai angka', '= read as a number')}
        </span>
        {sheet.rows.length > PREVIEW_ROWS && (
          <span>
            {t(
              `Menampilkan ${PREVIEW_ROWS} dari ${sheet.rows.length} baris — file Excel memuat semuanya.`,
              `Showing ${PREVIEW_ROWS} of ${sheet.rows.length} rows — the Excel file includes all of them.`,
            )}
          </span>
        )}
      </div>
    </div>
  )
}
