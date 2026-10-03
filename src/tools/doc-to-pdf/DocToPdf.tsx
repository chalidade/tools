import { useRef, useState, type DragEvent } from 'react'
import { AlertCircle, Download, FileUp, Loader2, Printer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { downloadPdf, printDocx, renderDocx } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'rendering' }
  | { kind: 'ready' }
  | { kind: 'exporting'; done: number; total: number }
  | { kind: 'error'; message: string }

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function toPdfName(name: string) {
  return name.replace(/\.[^.]+$/, '') + '.pdf'
}

export default function DocToPdf() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLElement[]>([])

  async function open(next: File) {
    if (/\.doc$/i.test(next.name)) {
      setStatus({
        kind: 'error',
        message:
          'Format .doc lama (Word 97–2003) belum didukung. Buka di Word/LibreOffice, simpan sebagai .docx, lalu coba lagi.',
      })
      return
    }
    if (!/\.docx$/i.test(next.name) && next.type !== DOCX_MIME) {
      setStatus({ kind: 'error', message: 'Pilih file Word berformat .docx.' })
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
        message: 'Dokumen tidak bisa dibaca. Pastikan file .docx tidak rusak atau terkunci password.',
      })
    }
  }

  async function exportPdf() {
    if (!file) return
    const total = sectionsRef.current.length
    setStatus({ kind: 'exporting', done: 0, total })
    try {
      await downloadPdf(sectionsRef.current, toPdfName(file.name), (done) =>
        setStatus({ kind: 'exporting', done, total }),
      )
      setStatus({ kind: 'ready' })
    } catch {
      setStatus({ kind: 'error', message: 'Gagal membuat PDF. Coba dokumen yang lebih kecil.' })
    }
  }

  function reset() {
    bodyRef.current?.replaceChildren()
    styleRef.current?.replaceChildren()
    sectionsRef.current = []
    setFile(null)
    setStatus({ kind: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) void open(dropped)
  }

  const hasDoc = status.kind === 'ready' || status.kind === 'exporting'
  const busy = status.kind === 'rendering' || status.kind === 'exporting'

  return (
    <div className="space-y-6">
      {!hasDoc && (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-16 text-center transition-colors',
            dragging ? 'border-primary bg-accent' : 'hover:border-primary/40',
            busy && 'pointer-events-none opacity-70',
          )}
        >
          {status.kind === 'rendering' ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : (
            <FileUp className="size-8 text-muted-foreground" />
          )}
          <p className="mt-4 font-medium">
            {status.kind === 'rendering' ? `Membaca ${file?.name}…` : 'Tarik file .docx ke sini'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">atau klik untuk memilih dari perangkat</p>
          <input
            ref={inputRef}
            type="file"
            accept={`.docx,.doc,${DOCX_MIME}`}
            className="sr-only"
            onChange={(e) => {
              const picked = e.target.files?.[0]
              if (picked) void open(picked)
            }}
          />
        </label>
      )}

      {status.kind === 'error' && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{status.message}</p>
        </div>
      )}

      {hasDoc && (
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {status.kind === 'exporting'
                ? `Membuat PDF… bagian ${status.done}/${status.total}`
                : 'Siap dikonversi'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportPdf} disabled={busy}>
              {status.kind === 'exporting' ? <Loader2 className="animate-spin" /> : <Download />}
              Unduh PDF
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => printDocx(bodyRef.current!, styleRef.current!, sectionsRef.current)}
              title="Lewat dialog cetak browser — pilih “Simpan sebagai PDF”. Teks di PDF bisa diseleksi."
            >
              <Printer />
              Cetak / Simpan PDF
            </Button>
            <Button variant="ghost" disabled={busy} onClick={reset}>
              <RotateCcw />
              File lain
            </Button>
          </div>
        </div>
      )}

      {hasDoc && (
        <p className="text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Unduh PDF</strong> langsung menyimpan file, tapi
          tiap halaman berupa gambar. Butuh teks yang bisa diseleksi/dicari? Pakai{' '}
          <strong className="font-medium text-foreground">Cetak / Simpan PDF</strong> lalu pilih “Simpan
          sebagai PDF”.
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
