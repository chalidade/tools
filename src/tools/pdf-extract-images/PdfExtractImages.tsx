import { useEffect, useState } from 'react'
import { Download, FileArchive, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { formatBytes } from '@/lib/image'
import { isPdfFile, openErrorMessage } from '@/lib/pdf-doc'
import { extractImages, imageFileName, type ExtractedImage } from './extract'

export default function PdfExtractImages() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  const [images, setImages] = useState<ExtractedImage[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [skipped, setSkipped] = useState(0)
  const [zipping, setZipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const u = images.map((i) => URL.createObjectURL(i.blob))
    setUrls(u)
    return () => u.forEach((x) => URL.revokeObjectURL(x))
  }, [images])

  const base = file ? file.name.replace(/\.pdf$/i, '') : 'pdf'

  async function open(files: File[]) {
    const next = files[0]
    if (!next) return
    if (!isPdfFile(next)) {
      setError(t('Pilih file berformat .pdf.', 'Choose a .pdf file.'))
      return
    }
    setError(null)
    setFile(next)
    setImages([])
    setBusy({ done: 0, total: 0 })
    try {
      const res = await extractImages(next, (done, total) => setBusy({ done, total }))
      setImages(res.images)
      setSkipped(res.skipped)
    } catch (e) {
      setError(openErrorMessage(e))
      setFile(null)
    } finally {
      setBusy(null)
    }
  }

  async function zipAll() {
    setZipping(true)
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      images.forEach((im, i) => zip.file(imageFileName(base, im, i), im.blob, { binary: true }))
      // Images are already compressed: store them.
      downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), `${base}-gambar.zip`)
    } catch {
      setError(t('Gagal membuat ZIP.', 'Could not build the ZIP.'))
    } finally {
      setZipping(false)
    }
  }

  if (!file) {
    return (
      <div className="space-y-4">
        <FileDrop accept=".pdf,application/pdf" label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')} onFiles={(f) => void open(f)} />
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  const total = images.reduce((n, i) => n + i.blob.size, 0)
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {busy
              ? t(`Membaca gambar… ${busy.done}/${busy.total || '?'}`, `Reading images… ${busy.done}/${busy.total || '?'}`)
              : t(`${images.length} gambar (${formatBytes(total)}).`, `${images.length} images (${formatBytes(total)}).`)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void zipAll()} disabled={!!busy || zipping || images.length === 0}>
            {zipping ? <Loader2 className="animate-spin" /> : <FileArchive />}
            {t('Unduh semua (ZIP)', 'Download all (ZIP)')}
          </Button>
          <Button variant="ghost" disabled={!!busy} onClick={() => { setFile(null); setImages([]) }}>
            <RotateCcw />
            {t('File lain', 'Another file')}
          </Button>
        </div>
      </div>

      {error && <ErrorNote message={error} />}
      {!busy && images.length === 0 && (
        <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          {t(
            'Tidak ada gambar yang bisa diambil dari PDF ini. Halaman hasil scan atau teks yang digambar sebagai garis tidak punya gambar terpisah; coba PDF ke Gambar untuk merender halamannya.',
            'No images could be taken from this PDF. Vector artwork has no separate pictures; try PDF to Image to render the pages instead.',
          )}
        </p>
      )}
      {skipped > 0 && !busy && (
        <p className="text-xs text-muted-foreground">
          {t(
            `${skipped} gambar dilewati (format khusus seperti JPEG 2000/JBIG2, atau topeng).`,
            `${skipped} images skipped (special formats such as JPEG 2000/JBIG2, or stencil masks).`,
          )}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((im, i) => (
          <li key={im.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
            <div className="flex h-36 items-center justify-center bg-muted/40 p-1">
              {urls[i] && <img src={urls[i]} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />}
            </div>
            <div className="flex items-center justify-between gap-2 p-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-mono">{im.width}×{im.height} · {im.ext.toUpperCase()}</p>
                <p className="text-muted-foreground">
                  {im.page ? t(`Hal. ${im.page}`, `Page ${im.page}`) : '—'} · {formatBytes(im.blob.size)}
                </p>
              </div>
              <Button size="icon" variant="ghost" aria-label={t('Unduh', 'Download')} onClick={() => downloadBlob(im.blob, imageFileName(base, im, i))}>
                <Download />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
