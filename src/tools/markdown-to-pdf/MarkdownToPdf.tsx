import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2, Printer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { downloadPdf, printDocx } from '../doc-to-pdf/convert'
import { markdownToDocx } from './docx'
import { PAGE_CSS, pageHtml, renderMarkdown, type FontKind, type PageKind } from './render'

const SAMPLE_ID = `# Judul dokumen

Tulis atau tempel **Markdown** di sini. Pratinjau halaman muncul di bawah.

## Daftar

- Poin pertama
- Poin kedua
  - Bersarang
- [x] Tugas selesai

| Item | Harga |
|------|------:|
| Kopi | 15.000 |
| Roti | 12.000 |

> Kutipan singkat.
`
const SAMPLE_EN = `# Document title

Write or paste **Markdown** here. The page preview appears below.

## List

- First point
- Second point
  - Nested
- [x] Done task

| Item | Price |
|------|------:|
| Coffee | 1.50 |
| Bread | 1.20 |

> A short quote.
`

type Busy = null | 'pdf' | 'docx'

export default function MarkdownToPdf() {
  const t = useT()
  const [text, setText] = useState('')
  const [name, setName] = useState('dokumen')
  const [page, setPage] = useState<PageKind>('a4')
  const [margin, setMargin] = useState(20)
  const [font, setFont] = useState<FontKind>('sans')
  const [breaks, setBreaks] = useState(false)
  const [html, setHtml] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const bodyRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)
  const deferred = useDeferredValue(text)

  useEffect(() => {
    let live = true
    void renderMarkdown(deferred, breaks).then((h) => live && setHtml(h))
    return () => {
      live = false
    }
  }, [deferred, breaks])

  const sections = () => Array.from(bodyRef.current?.querySelectorAll<HTMLElement>('section.docx') ?? [])
  const hasText = text.trim().length > 0

  async function open(file: File) {
    setError('')
    if (file.size > 5_000_000) {
      setError(t('File terlalu besar (maks 5 MB).', 'File is too large (5 MB max).'))
      return
    }
    setText(await file.text())
    setName(file.name.replace(/\.[^.]+$/, '') || 'dokumen')
    // Plain text keeps its line breaks; Markdown follows its own rules.
    setBreaks(/\.txt$/i.test(file.name))
  }

  async function savePdf() {
    setBusy('pdf')
    setError('')
    try {
      await downloadPdf(sections(), withExtension(name, '.pdf'), (done, total) => setProgress(`${done}/${total}`))
    } catch {
      setError(t('Gagal membuat PDF. Coba dokumen yang lebih pendek.', "Couldn't create the PDF. Try a shorter document."))
    }
    setProgress('')
    setBusy(null)
  }

  async function saveDocx() {
    setBusy('docx')
    setError('')
    try {
      downloadBlob(await markdownToDocx(text, { page, marginMm: margin, font, breaks }), withExtension(name, '.docx'))
    } catch {
      setError(t('Gagal membuat DOCX.', "Couldn't create the DOCX."))
    }
    setBusy(null)
  }

  return (
    <div className="space-y-6">
      {!hasText && (
        <FileDrop
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          label={t('Tarik file .md atau .txt ke sini', 'Drag a .md or .txt file here')}
          onFiles={([f]) => void open(f)}
        />
      )}

      <label className="block space-y-2">
        <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          {t('Tulis atau tempel di sini', 'Write or paste here')}
          {!hasText && (
            <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setText(t(SAMPLE_ID, SAMPLE_EN))}>
              {t('Isi contoh', 'Fill with an example')}
            </button>
          )}
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder="# Judul"
          className="block h-56 w-full resize-y rounded-xl border bg-card p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <div className="flex flex-wrap gap-x-6 gap-y-4 rounded-2xl border bg-card p-4">
        <Segmented label={t('Kertas', 'Paper')} value={page} onChange={setPage} options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }]} />
        <Segmented
          label={t('Margin', 'Margin')}
          value={margin}
          onChange={setMargin}
          options={[
            { value: 12, label: t('Sempit', 'Narrow') },
            { value: 20, label: t('Normal', 'Normal') },
            { value: 25, label: t('Lebar', 'Wide') },
          ]}
        />
        <Segmented label={t('Huruf', 'Font')} value={font} onChange={setFont} options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }]} />
        <label className="flex items-end gap-2 pb-1.5 text-sm">
          <input type="checkbox" checked={breaks} onChange={(e) => setBreaks(e.target.checked)} className="size-4 accent-primary" />
          {t('Enter = baris baru', 'Enter = new line')}
        </label>
      </div>

      {error && <ErrorNote message={error} />}

      {hasText && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void savePdf()} disabled={busy !== null}>
            {busy === 'pdf' ? <Loader2 className="animate-spin" /> : <Download />}
            {busy === 'pdf' ? t(`Membuat PDF… ${progress}`, `Creating PDF… ${progress}`) : t('Unduh PDF', 'Download PDF')}
          </Button>
          <Button variant="outline" onClick={() => void saveDocx()} disabled={busy !== null}>
            {busy === 'docx' ? <Loader2 className="animate-spin" /> : <FileText />}
            {t('Unduh DOCX', 'Download DOCX')}
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => void printDocx(bodyRef.current!, styleRef.current!, sections())}
            title={t('Lewat dialog cetak browser — pilih “Simpan sebagai PDF”. Teks di PDF bisa diseleksi.', 'Uses the browser’s print dialog — choose “Save as PDF”. Text in the PDF stays selectable.')}
          >
            <Printer />
            {t('Cetak / Simpan PDF', 'Print / Save PDF')}
          </Button>
          <Button variant="ghost" disabled={busy !== null} onClick={() => setText('')}>
            <RotateCcw />
            {t('Kosongkan', 'Clear')}
          </Button>
        </div>
      )}

      {hasText && (
        <p className="text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">{t('Unduh PDF', 'Download PDF')}</strong>{' '}
          {t(
            'menyimpan langsung, tapi tiap halaman berupa gambar. Butuh teks yang bisa diseleksi/dicari? Pakai',
            'saves right away, but each page becomes an image. Need selectable/searchable text? Use',
          )}{' '}
          <strong className="font-medium text-foreground">{t('Cetak / Simpan PDF', 'Print / Save PDF')}</strong>{' '}
          {t('lalu pilih “Simpan sebagai PDF”. Gambar dari internet tidak dimuat; hanya gambar data: yang tampil.', 'and choose “Save as PDF”. Images from the web are not loaded; only data: images show.')}
        </p>
      )}

      <div ref={styleRef} hidden>
        <style>{PAGE_CSS}</style>
      </div>
      <div className={hasText ? 'overflow-auto rounded-2xl border' : 'hidden'}>
        <div ref={bodyRef} dangerouslySetInnerHTML={{ __html: pageHtml(html, { page, marginMm: margin, font, breaks }) }} />
      </div>
    </div>
  )
}
