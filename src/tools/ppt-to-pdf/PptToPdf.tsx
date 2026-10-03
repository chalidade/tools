import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Printer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { downloadBlob, withExtension } from '@/lib/download'
import { downloadPdf, printDeck, readPptx, type Deck } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; deck: Deck }
  | { kind: 'exporting'; deck: Deck; done: number; total: number }
  | { kind: 'error'; message: string }

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export default function PptToPdf() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  // Full-size copies of the slides, kept off-screen: the PDF is made from these
  // rather than the scaled thumbnails, so it is sharp and correctly sized.
  const exportRef = useRef<HTMLDivElement>(null)

  async function open(next: File) {
    if (/\.ppt$/i.test(next.name)) {
      setStatus({
        kind: 'error',
        message:
          'Format .ppt lama (PowerPoint 97–2003) belum didukung. Buka di PowerPoint/LibreOffice, simpan sebagai .pptx, lalu coba lagi.',
      })
      return
    }
    if (!/\.pptx$/i.test(next.name) && next.type !== PPTX_MIME) {
      setStatus({ kind: 'error', message: 'Pilih file PowerPoint berformat .pptx.' })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      const deck = await readPptx(next)
      if (deck.slides.length === 0) throw new Error('empty')
      setStatus({ kind: 'ready', deck })
    } catch {
      setStatus({
        kind: 'error',
        message: 'Presentasi tidak bisa dibaca. Pastikan file .pptx tidak rusak atau terkunci password.',
      })
    }
  }

  async function exportPdf(deck: Deck) {
    if (!file || !exportRef.current) return
    const slides = Array.from(exportRef.current.querySelectorAll<HTMLElement>('.slide'))
    setStatus({ kind: 'exporting', deck, done: 0, total: slides.length })
    try {
      const blob = await downloadPdf(slides, deck, (done, total) => setStatus({ kind: 'exporting', deck, done, total }))
      downloadBlob(blob, withExtension(file.name, '.pdf'))
      setStatus({ kind: 'ready', deck })
    } catch {
      setStatus({ kind: 'error', message: 'Gagal membuat PDF. Coba presentasi yang lebih kecil.' })
    }
  }

  if (status.kind === 'ready' || status.kind === 'exporting') {
    const { deck } = status
    const busy = status.kind === 'exporting'

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy ? `Membuat PDF… slide ${status.done}/${status.total}` : `${deck.slides.length} slide · siap dikonversi`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void exportPdf(deck)} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              Unduh PDF
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void printDeck(deck, file?.name ?? 'Presentasi')}
              title="Lewat dialog cetak browser — pilih “Simpan sebagai PDF”. Teks di PDF bisa diseleksi."
            >
              <Printer />
              Cetak / Simpan PDF
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              File lain
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Unduh PDF</strong> langsung menyimpan file, satu halaman per
          slide berupa gambar. Butuh teks yang bisa diseleksi? Pakai{' '}
          <strong className="font-medium text-foreground">Cetak / Simpan PDF</strong> lalu pilih “Simpan sebagai PDF”.
          Animasi, transisi, dan video tidak ikut; font yang tidak terpasang di perangkatmu diganti yang mirip.
        </p>

        {/* A div grid, not <ol>: slides contain their own lists, and nesting
            them in a list would turn their bullets into circles. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deck.slides.map((html, i) => (
            <figure key={i} className="rounded-2xl border bg-card p-2.5">
              <SlideThumb html={html} width={deck.width} height={deck.height} />
              <figcaption className="mt-2 px-1 font-mono text-[11px] text-muted-foreground">Slide {i + 1}</figcaption>
            </figure>
          ))}
        </div>

        <div
          ref={exportRef}
          aria-hidden
          className="pointer-events-none fixed top-0 -left-[100000px]"
          dangerouslySetInnerHTML={{ __html: deck.slides.join('') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept={`.pptx,.ppt,${PPTX_MIME}`}
        label="Tarik file .pptx ke sini"
        busyLabel={status.kind === 'reading' ? `Membaca ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}

/** A slide rendered at its real size, scaled down to fit the card. */
function SlideThumb({ html, width, height }: { html: string; width: number; height: number }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width))
    observer.observe(box)
    return () => observer.disconnect()
  }, [width])

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {scale > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width, height, transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}
