import { useRef, useState } from 'react'
import { Download, Loader2, Printer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { downloadPdf, printDocx, renderDocx } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'rendering' }
  | { kind: 'ready' }
  | { kind: 'exporting'; done: number; total: number }
  | { kind: 'error'; message: string }

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export default function DocToPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLElement[]>([])

  async function open(next: File) {
    if (/\.doc$/i.test(next.name)) {
      setStatus({
        kind: 'error',
        message: t(
          'Format .doc lama (Word 97–2003) belum didukung. Buka di Word/LibreOffice, simpan sebagai .docx, lalu coba lagi.',
          "The old .doc format (Word 97–2003) isn't supported yet. Open it in Word/LibreOffice, save it as .docx, then try again.",
        ),
      })
      return
    }
    if (!/\.docx$/i.test(next.name) && next.type !== DOCX_MIME) {
      setStatus({ kind: 'error', message: t('Pilih file Word berformat .docx.', 'Choose a Word file in .docx format.') })
      return
    }

    setFile(next)
    setStatus({ kind: 'rendering' })
    try {
      const sections = await renderDocx(next, bodyRef.current!, styleRef.current!)
      if (sections.length === 0) throw new Error('empty')
      sectionsRef.current = sections
      setStatus({ kind: 'ready' })
    } catch {
      setStatus({
        kind: 'error',
        message: t(
          'Dokumen tidak bisa dibaca. Pastikan file .docx tidak rusak atau terkunci password.',
          "The document couldn't be read. Make sure the .docx file isn't damaged or password-protected.",
        ),
      })
    }
  }

  async function exportPdf() {
    if (!file) return
    const total = sectionsRef.current.length
    setStatus({ kind: 'exporting', done: 0, total })
    try {
      await downloadPdf(sectionsRef.current, withExtension(file.name, '.pdf'), (done) =>
        setStatus({ kind: 'exporting', done, total }),
      )
      setStatus({ kind: 'ready' })
    } catch {
      setStatus({ kind: 'error', message: t('Gagal membuat PDF. Coba dokumen yang lebih kecil.', "Couldn't create the PDF. Try a smaller document.") })
    }
  }

  function reset() {
    bodyRef.current?.replaceChildren()
    styleRef.current?.replaceChildren()
    sectionsRef.current = []
    setFile(null)
    setStatus({ kind: 'idle' })
  }

  const hasDoc = status.kind === 'ready' || status.kind === 'exporting'
  const busy = status.kind === 'exporting'

  return (
    <div className="space-y-6">
      {!hasDoc && (
        <FileDrop
          accept={`.docx,.doc,${DOCX_MIME}`}
          label={t('Tarik file .docx ke sini', 'Drag a .docx file here')}
          busyLabel={status.kind === 'rendering' ? t(`Membaca ${file?.name}…`, `Reading ${file?.name}…`) : undefined}
          onFiles={([f]) => void open(f)}
        />
      )}

      {status.kind === 'error' && <ErrorNote message={status.message} />}

      {hasDoc && (
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {status.kind === 'exporting'
                ? t(`Membuat PDF… bagian ${status.done}/${status.total}`, `Creating PDF… section ${status.done}/${status.total}`)
                : t('Siap dikonversi', 'Ready to convert')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportPdf} disabled={busy}>
              {status.kind === 'exporting' ? <Loader2 className="animate-spin" /> : <Download />}
              {t('Unduh PDF', 'Download PDF')}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => printDocx(bodyRef.current!, styleRef.current!, sectionsRef.current)}
              title={t(
                'Lewat dialog cetak browser — pilih “Simpan sebagai PDF”. Teks di PDF bisa diseleksi.',
                'Uses the browser’s print dialog — choose “Save as PDF”. Text in the PDF stays selectable.',
              )}
            >
              <Printer />
              {t('Cetak / Simpan PDF', 'Print / Save PDF')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={reset}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>
      )}

      {hasDoc && (
        <p className="text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">{t('Unduh PDF', 'Download PDF')}</strong>{' '}
          {t(
            'langsung menyimpan file, tapi tiap halaman berupa gambar. Butuh teks yang bisa diseleksi/dicari? Pakai',
            'saves the file right away, but each page becomes an image. Need selectable/searchable text? Use',
          )}{' '}
          <strong className="font-medium text-foreground">{t('Cetak / Simpan PDF', 'Print / Save PDF')}</strong>{' '}
          {t('lalu pilih “Simpan sebagai PDF”.', 'and choose “Save as PDF”.')}
        </p>
      )}

      {/* docx-preview renders into these; kept mounted so refs stay valid. */}
      <div ref={styleRef} hidden />
      <div
        className={cn(
          'overflow-auto rounded-2xl border [&_.docx-wrapper]:bg-muted! [&_.docx-wrapper]:p-4! sm:[&_.docx-wrapper]:p-8!',
          !hasDoc && 'hidden',
        )}
      >
        <div ref={bodyRef} />
      </div>
    </div>
  )
}
