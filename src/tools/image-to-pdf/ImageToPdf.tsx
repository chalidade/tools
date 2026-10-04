import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2, Plus, RotateCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { cn } from '@/lib/utils'
import {
  buildPdf,
  layout,
  loadImage,
  rotateThumb,
  UnsupportedImageError,
  type ImageItem,
  type Orientation,
  type PageSize,
  type PdfOptions,
  type Rotation,
} from './convert'

const ACCEPT = 'image/*,.heic,.heif'

const PAGE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'fit', label: 'Sesuai gambar' },
]

const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'portrait', label: 'Potret' },
  { value: 'landscape', label: 'Lanskap' },
]

const MARGIN_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Tanpa' },
  { value: 20, label: 'Kecil' },
  { value: 40, label: 'Besar' },
]

function skippedMessage(names: string[]) {
  const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} dan ${names.length - 3} lainnya` : names.join(', ')
  return `${list} tidak bisa dibaca browser ini dan dilewati. Foto HEIC dari iPhone hanya terbaca di Safari — ubah ke JPG dulu bila perlu.`
}

export default function ImageToPdf() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [opts, setOpts] = useState<PdfOptions>({ page: 'a4', orientation: 'auto', margin: 20 })
  const [loading, setLoading] = useState(0)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const addRef = useRef<HTMLInputElement>(null)

  async function add(files: File[]) {
    setError(null)
    setLoading((n) => n + files.length)
    const skipped: string[] = []
    // One at a time keeps memory flat when someone drops 50 phone photos.
    for (const file of files) {
      try {
        const item = await loadImage(file)
        setItems((prev) => [...prev, item])
      } catch (e) {
        if (e instanceof UnsupportedImageError) skipped.push(e.fileName)
        else skipped.push(file.name)
      } finally {
        setLoading((n) => n - 1)
      }
    }
    if (skipped.length) setError(skippedMessage(skipped))
  }

  async function rotate(id: string) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const next = ((item.rotation + 90) % 360) as Rotation
    const thumb = await rotateThumb(item, next)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, rotation: next, thumb } : i)))
  }

  function move(id: string, by: number) {
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === id)
      const to = from + by
      if (from < 0 || to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function moveTo(id: string, overId: string) {
    if (id === overId) return
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === id)
      const to = prev.findIndex((i) => i.id === overId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  async function exportPdf() {
    setError(null)
    setProgress({ done: 0, total: items.length })
    try {
      const blob = await buildPdf(items, opts, (done, total) => setProgress({ done, total }))
      const name = items.length === 1 ? withExtension(items[0].file.name, '.pdf') : 'gambar.pdf'
      downloadBlob(blob, name)
    } catch {
      setError('Gagal membuat PDF. Coba kurangi jumlah gambar atau ukurannya.')
    } finally {
      setProgress(null)
    }
  }

  const busy = progress !== null

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept={ACCEPT}
          multiple
          label="Tarik gambar ke sini"
          busyLabel={loading ? `Membaca ${loading} gambar…` : undefined}
          onFiles={(files) => void add(files)}
        />
        <p className="text-center text-xs text-muted-foreground">JPG, PNG, WebP, GIF, BMP — bisa banyak sekaligus.</p>
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            {items.length} gambar · {items.length} halaman
          </p>
          <p className="text-sm text-muted-foreground">
            {busy
              ? `Membuat PDF… halaman ${progress.done}/${progress.total}`
              : loading
                ? `Membaca ${loading} gambar lagi…`
                : 'Seret untuk mengatur urutan.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportPdf} disabled={busy || loading > 0}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            Unduh PDF
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => addRef.current?.click()}>
            <Plus />
            Tambah
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setItems([])}>
            <Trash2 />
            Hapus semua
          </Button>
          <input
            ref={addRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (picked.length) void add(picked)
            }}
          />
        </div>
      </div>

      {/* Settings */}
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
          disabled={busy || opts.page === 'fit'}
          onChange={(orientation) => setOpts((o) => ({ ...o, orientation }))}
        />
        <Segmented
          label="Margin"
          value={opts.margin}
          options={MARGIN_OPTIONS}
          disabled={busy}
          onChange={(margin) => setOpts((o) => ({ ...o, margin }))}
        />
      </div>

      {error && <ErrorNote message={error} />}

      {/* Pages — each card is the real page layout, scaled down. */}
      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => {
          const l = layout(item, opts)
          return (
            <li
              key={item.id}
              draggable={!busy}
              onDragStart={(e) => {
                setDragId(item.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragId) moveTo(dragId, item.id)
              }}
              onDragEnd={() => setDragId(null)}
              className={cn(
                'group flex cursor-grab flex-col rounded-2xl border bg-card p-3 transition-shadow active:cursor-grabbing',
                dragId === item.id ? 'opacity-40' : 'hover:shadow-lg hover:shadow-brand-2/10',
              )}
            >
              <div className="grid flex-1 place-items-center rounded-xl bg-muted/60 p-3">
                <div
                  className="relative w-full overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-black/5"
                  style={{ aspectRatio: `${l.pageW} / ${l.pageH}` }}
                >
                  <img
                    src={item.thumb}
                    alt=""
                    draggable={false}
                    className="absolute select-none"
                    style={{
                      left: `${(l.x / l.pageW) * 100}%`,
                      top: `${(l.y / l.pageH) * 100}%`,
                      width: `${(l.w / l.pageW) * 100}%`,
                      height: `${(l.h / l.pageH) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-gradient-brand font-mono text-[11px] font-medium text-white">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 truncate px-1 text-xs text-muted-foreground" title={item.file.name}>
                  {item.file.name}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex">
                  <IconButton label="Pindah ke kiri" disabled={busy || i === 0} onClick={() => move(item.id, -1)}>
                    <ChevronLeft />
                  </IconButton>
                  <IconButton
                    label="Pindah ke kanan"
                    disabled={busy || i === items.length - 1}
                    onClick={() => move(item.id, 1)}
                  >
                    <ChevronRight />
                  </IconButton>
                </div>
                <div className="flex">
                  <IconButton label="Putar 90°" disabled={busy} onClick={() => void rotate(item.id)}>
                    <RotateCw />
                  </IconButton>
                  <IconButton
                    label="Hapus"
                    disabled={busy}
                    onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                  >
                    <X />
                  </IconButton>
                </div>
              </div>
            </li>
          )
        })}

        <li>
          <button
            type="button"
            disabled={busy}
            onClick={() => addRef.current?.click()}
            className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-brand-2/40 hover:text-foreground"
          >
            <Plus className="size-5" />
            Tambah gambar
          </button>
        </li>
      </ol>
    </div>
  )
}
