import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, PenLine, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { readSignatureImage, signPdf, type Placement, type Signature } from './sign'
import { SignaturePad } from './SignaturePad'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; thumbs: PageThumb[] }
  | { kind: 'error'; message: string }

type Source = 'draw' | 'upload'

/** Drag in progress: what moves, and where the pointer and box started. */
interface Drag {
  id: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  from: Placement
  rect: DOMRect
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function SignPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [signature, setSignature] = useState<Signature | null>(null)
  const [source, setSource] = useState<Source>('draw')
  const [removeWhite, setRemoveWhite] = useState(true)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [page, setPage] = useState(1)
  const [large, setLarge] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const drag = useRef<Drag | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const thumbs = status.kind === 'ready' ? status.thumbs : null

  // Sharper render of the page being signed, made once per page.
  useEffect(() => {
    if (!file || !thumbs || large[page]) return
    let current = true
    void pageThumbs(file, 1400, undefined, [page]).then(({ thumbs: [big] }) => {
      if (current) setLarge((l) => ({ ...l, [page]: big.src }))
    })
    return () => {
      current = false
    }
  }, [file, thumbs, page, large])

  // Release the preview URL of a replaced signature.
  useEffect(() => {
    const url = signature?.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [signature])

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setError(null)
    setPlacements([])
    setLarge({})
    setPage(1)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const { thumbs } = await pageThumbs(next, 200, (done, total) => setStatus({ kind: 'reading', done, total }))
      setStatus({ kind: 'ready', thumbs })
    } catch (e) {
      setStatus({ kind: 'error', message: openErrorMessage(e) })
    }
  }

  async function upload(picked: File) {
    setError(null)
    try {
      const sig = await readSignatureImage(picked, removeWhite)
      if (!sig) throw new Error('empty')
      applySignature(sig)
    } catch {
      setError(
        t(
          'Gambar tidak bisa dibaca, atau tidak ada tanda tangan yang terlihat. Pakai foto PNG/JPG dengan tinta gelap di kertas terang.',
          "Couldn't read the image, or no signature is visible in it. Use a PNG/JPG photo of dark ink on light paper.",
        ),
      )
    }
  }

  function applySignature(sig: Signature) {
    setSignature(sig)
    // First signature: place it right away on the page being viewed.
    if (!placements.length) addPlacement(sig)
  }

  function addPlacement(sig = signature) {
    if (!sig || !thumbs) return
    const shown = thumbs[page - 1]
    const w = 0.3
    const h = (w * shown.width * sig.height) / sig.width / shown.height
    setPlacements((prev) => [
      ...prev,
      { id: crypto.randomUUID(), page, x: 0.6 - w / 2, y: clamp(0.8 - h / 2, 0, 1 - h), w },
    ])
  }

  function startDrag(e: PointerEvent<HTMLElement>, p: Placement, mode: Drag['mode']) {
    e.stopPropagation()
    e.preventDefault()
    const box = e.currentTarget.closest('[data-page]')
    if (!box) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: p.id, mode, startX: e.clientX, startY: e.clientY, from: p, rect: box.getBoundingClientRect() }
  }

  function onDrag(e: PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d || !signature) return
    const dx = (e.clientX - d.startX) / d.rect.width
    const dy = (e.clientY - d.startY) / d.rect.height
    const aspect = d.rect.width / d.rect.height / (signature.width / signature.height)
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== d.id) return p
        if (d.mode === 'resize') {
          const w = clamp(d.from.w + dx, 0.05, 1 - d.from.x)
          return { ...p, w: Math.min(w, (1 - d.from.y) / aspect) }
        }
        const h = d.from.w * aspect
        return { ...p, x: clamp(d.from.x + dx, 0, 1 - d.from.w), y: clamp(d.from.y + dy, 0, 1 - h) }
      }),
    )
  }

  async function save() {
    if (!file || !signature || !placements.length) return
    setSaving(true)
    setError(null)
    try {
      const blob = await signPdf(file, signature, placements)
      downloadBlob(blob, file.name.replace(/\.pdf$/i, '') + t('-ditandatangani.pdf', '-signed.pdf'))
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (thumbs && file) {
    const shown = thumbs[page - 1]
    const onPage = placements.filter((p) => p.page === page)
    const perPage = (n: number) => placements.filter((p) => p.page === n).length

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {!signature
                ? t('Buat tanda tanganmu dulu.', 'Create your signature first.')
                : placements.length
                  ? t(
                      `${placements.length} tanda tangan di ${new Set(placements.map((p) => p.page)).size} halaman.`,
                      `${placements.length} signature(s) on ${new Set(placements.map((p) => p.page)).size} page(s).`,
                    )
                  : t('Tempel tanda tangan di halaman yang dipilih.', 'Place the signature on the page you choose.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving || !signature || !placements.length}>
              {saving ? <Loader2 className="animate-spin" /> : <PenLine />}
              {t('Simpan & unduh', 'Save & download')}
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Signature */}
          <div className="space-y-4 rounded-2xl border bg-card p-5">
            <p className="font-medium">{t('Tanda tangan', 'Signature')}</p>
            {signature ? (
              <div className="space-y-3">
                <div className="grid h-32 place-items-center rounded-xl border bg-white p-3">
                  <img src={signature.url} alt={t('Tanda tangan', 'Signature')} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => addPlacement()} disabled={saving}>
                    <Plus />
                    {t(`Tempel di halaman ${page}`, `Place on page ${page}`)}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={saving}
                    onClick={() => {
                      setSignature(null)
                      setPlacements([])
                    }}
                  >
                    <RotateCcw />
                    {t('Buat ulang', 'Start over')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Segmented
                  label={t('Cara', 'Method')}
                  value={source}
                  options={[
                    { value: 'draw', label: t('Gambar', 'Draw') },
                    { value: 'upload', label: t('Unggah foto', 'Upload a photo') },
                  ]}
                  onChange={setSource}
                />
                {source === 'draw' ? (
                  <SignaturePad onDone={applySignature} />
                ) : (
                  <div className="space-y-3">
                    <Button variant="outline" onClick={() => uploadRef.current?.click()}>
                      <ImagePlus />
                      {t('Pilih foto tanda tangan', 'Choose a signature photo')}
                    </Button>
                    <input
                      ref={uploadRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const picked = e.target.files?.[0]
                        e.target.value = ''
                        if (picked) void upload(picked)
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={removeWhite}
                        onChange={(e) => setRemoveWhite(e.target.checked)}
                        className="size-4 accent-[var(--brand-2)]"
                      />
                      {t('Hapus latar putih (untuk foto tanda tangan di kertas)', 'Remove white background (for a photo of a signature on paper)')}
                    </label>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t(
                'Ini tanda tangan berupa gambar, bukan tanda tangan digital bersertifikat (TTE).',
                'This is an image of a signature, not a certified digital signature.',
              )}
            </p>
          </div>

          {/* Page */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(`Halaman ${page} dari ${thumbs.length}`, `Page ${page} of ${thumbs.length}`)}
              </p>
              <div className="flex">
                <IconButton label={t('Halaman sebelumnya', 'Previous page')} disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft />
                </IconButton>
                <IconButton label={t('Halaman berikutnya', 'Next page')} disabled={page === thumbs.length} onClick={() => setPage(page + 1)}>
                  <ChevronRight />
                </IconButton>
              </div>
            </div>
            <div className="grid place-items-center rounded-2xl border bg-muted/60 p-4">
              <div
                data-page
                className="relative w-full max-w-xl select-none shadow-md ring-1 ring-black/5"
                style={{ aspectRatio: `${shown.width} / ${shown.height}` }}
              >
                <img
                  src={large[page] ?? shown.src}
                  alt={t(`Halaman ${page}`, `Page ${page}`)}
                  draggable={false}
                  className="absolute inset-0 size-full"
                />
                {signature &&
                  onPage.map((p) => (
                    <div
                      key={p.id}
                      onPointerDown={(e) => startDrag(e, p, 'move')}
                      onPointerMove={onDrag}
                      onPointerUp={() => (drag.current = null)}
                      className="group absolute cursor-move touch-none outline-1 outline-brand-2/60 outline-dashed hover:outline-2"
                      style={{
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        width: `${p.w * 100}%`,
                        aspectRatio: `${signature.width} / ${signature.height}`,
                      }}
                    >
                      <img src={signature.url} alt="" draggable={false} className="size-full" />
                      <button
                        type="button"
                        aria-label={t('Hapus tanda tangan ini', 'Remove this signature')}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setPlacements((prev) => prev.filter((x) => x.id !== p.id))}
                        className="absolute -top-3 -right-3 grid size-6 place-items-center rounded-full bg-destructive text-white shadow"
                      >
                        <X className="size-3.5" />
                      </button>
                      <span
                        aria-label={t('Ubah ukuran', 'Resize')}
                        onPointerDown={(e) => startDrag(e, p, 'resize')}
                        onPointerMove={onDrag}
                        onPointerUp={() => (drag.current = null)}
                        className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize touch-none rounded-sm border-2 border-background bg-brand-2 shadow"
                      />
                    </div>
                  ))}
              </div>
            </div>
            {onPage.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t(
                  'Seret tanda tangan untuk memindah, tarik titik di sudutnya untuk mengubah ukuran.',
                  'Drag a signature to move it; drag its corner handle to resize it.',
                )}
              </p>
            )}
          </div>
        </div>

        {/* Page strip */}
        {thumbs.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {thumbs.map((thumb, i) => {
              const n = i + 1
              const count = perPage(n)
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'relative shrink-0 rounded-xl border bg-card p-1.5 transition-all',
                    n === page ? 'border-brand-2/60 ring-2 ring-brand-2/30' : 'opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={thumb.src} alt={t(`Halaman ${n}`, `Page ${n}`)} className="h-24 rounded-sm" />
                  <span className="mt-1 block text-center font-mono text-[11px] text-muted-foreground">{n}</span>
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-gradient-brand text-[10px] font-medium text-white">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf yang mau ditandatangani', 'Drop the .pdf file you want to sign')}
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? t(`Menyiapkan pratinjau ${status.done}/${status.total}…`, `Preparing previews ${status.done}/${status.total}…`)
              : t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`)
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
