import { useMemo, useState } from 'react'
import { Check, Copy, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import type { PageText } from '@/lib/pdf-text'
import { LockedPdfError, readPdfText, ScannedPdfError, toMarkdown } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; pages: PageText[] }
  | { kind: 'error'; message: string }

function errorMessage(e: unknown) {
  if (e instanceof ScannedPdfError)
    return tr(
      'PDF ini tidak berisi teks. Biasanya karena hasil scan atau foto, dan butuh OCR yang belum didukung tool ini.',
      "This PDF has no text. It's usually a scan or a photo, which needs OCR — not supported by this tool yet.",
    )
  if (e instanceof LockedPdfError)
    return tr(
      'PDF ini dikunci password. Buka kuncinya dulu dengan tool “Buka Proteksi PDF”.',
      'This PDF is password-protected. Unlock it first with the “Unlock PDF” tool.',
    )
  return tr('PDF tidak bisa dibaca. Pastikan filenya tidak rusak.', "Couldn't read the PDF. Make sure the file isn't damaged.")
}

export default function PdfToMarkdown() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [pageBreaks, setPageBreaks] = useState(false)
  const [copied, setCopied] = useState(false)

  const pages = status.kind === 'ready' ? status.pages : null
  const markdown = useMemo(() => (pages ? toMarkdown(pages, { pageBreaks }) : ''), [pages, pageBreaks])

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const read = await readPdfText(next, (done, total) => setStatus({ kind: 'reading', done, total }))
      setStatus({ kind: 'ready', pages: read })
    } catch (e) {
      setStatus({ kind: 'error', message: errorMessage(e) })
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (e.g. insecure context): the text area stays selectable.
    }
  }

  if (pages && file) {
    const lines = markdown.split('\n').length
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {t(`${pages.length} halaman · ${lines} baris Markdown`, `${pages.length} pages · ${lines} lines of Markdown`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), withExtension(file.name, '.md'))
              }
            >
              <Download />
              {t('Unduh .md', 'Download .md')}
            </Button>
            <Button variant="outline" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />}
              {copied ? t('Tersalin', 'Copied') : t('Salin', 'Copy')}
            </Button>
            <Button variant="ghost" onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-2xl border bg-card p-4">
          <Segmented
            label={t('Pemisah halaman', 'Page breaks')}
            value={pageBreaks ? 'on' : 'off'}
            options={[
              { value: 'off', label: t('Tanpa', 'None') },
              { value: 'on', label: t('Garis (---)', 'Rule (---)') },
            ]}
            onChange={(v) => setPageBreaks(v === 'on')}
          />
          <p className="max-w-md text-xs text-muted-foreground">
            {t(
              'Judul dikenali dari ukuran huruf, lalu tebal/miring, daftar, dan tabel ikut. Gambar tidak ikut.',
              'Headings are detected from font size; bold/italic, lists and tables carry over too. Images are left out.',
            )}
          </p>
        </div>

        <textarea
          readOnly
          value={markdown}
          spellCheck={false}
          className="h-[32rem] w-full resize-y rounded-2xl border bg-card p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-brand-2/50"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')}
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
