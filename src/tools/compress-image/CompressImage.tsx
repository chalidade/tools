import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  canEncodeWebp,
  compressImage,
  outputName,
  outputType,
  type ImageOptions,
  type ImageResult,
  type OutFormat,
} from './compress'

interface Item {
  id: number
  file: File
  preview: string
  result?: ImageResult
  /** The settings `result` was made with; a mismatch means it is out of date. */
  doneFor?: string
  error?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.heic,.heif'

const FORMAT_OPTIONS: { value: OutFormat; label: readonly [string, string] }[] = [
  { value: 'same', label: ['Sama', 'Same'] },
  { value: 'jpeg', label: ['JPG', 'JPG'] },
  { value: 'webp', label: ['WebP', 'WebP'] },
]
const SIZE_OPTIONS: { value: number; label: readonly [string, string] }[] = [
  { value: 0, label: ['Asli', 'Original'] },
  { value: 2560, label: ['2560 px', '2560 px'] },
  { value: 1920, label: ['1920 px', '1920 px'] },
  { value: 1280, label: ['1280 px', '1280 px'] },
]

function formatSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

let nextId = 0

export default function CompressImage() {
  const t = useT()
  const [items, setItems] = useState<Item[]>([])
  const [opts, setOpts] = useState<ImageOptions>({ format: 'webp', quality: 0.75, maxSide: 1920 })
  const [busy, setBusy] = useState(false)
  const addRef = useRef<HTMLInputElement>(null)
  const optsKey = JSON.stringify(opts)

  // (Re)compress whatever is out of date — new files, or all of them after a
  // settings change — one at a time, in the background.
  useEffect(() => {
    let cancelled = false
    const pending = items.find((i) => i.doneFor !== optsKey && !i.error)
    if (!pending) {
      setBusy(false)
      return
    }
    setBusy(true)
    const timer = setTimeout(async () => {
      try {
        const result = await compressImage(pending.file, opts)
        if (!cancelled)
          setItems((prev) => prev.map((i) => (i.id === pending.id ? { ...i, result, doneFor: optsKey } : i)))
      } catch {
        if (!cancelled) setItems((prev) => prev.map((i) => (i.id === pending.id ? { ...i, error: true } : i)))
      }
    }, 120) // small debounce so dragging the quality slider does not queue every step
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [items, opts, optsKey])

  // Release the preview URLs when the tool closes.
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), [])

  function add(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    setItems((prev) => [...prev, ...images.map((file) => ({ id: nextId++, file, preview: URL.createObjectURL(file) }))])
  }

  function remove(id: number) {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id)
      if (gone) URL.revokeObjectURL(gone.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  async function downloadAll() {
    const done = items.filter((i) => i.result && i.doneFor === optsKey)
    if (done.length === 1) return downloadOne(done[0])
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const used = new Set<string>()
    for (const item of done) {
      let name = outputName(item.file, item.result!.kept ? item.file.type : outputType(item.file, opts.format))
      for (let n = 2; used.has(name); n++) name = name.replace(/(\.[^.]+)$/, `-${n}$1`)
      used.add(name)
      zip.file(name, item.result!.blob, { compression: 'STORE' })
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), tr('gambar-kompres', 'compressed-images') + '.zip')
  }

  function downloadOne(item: Item) {
    if (!item.result) return
    downloadBlob(
      item.result.blob,
      outputName(item.file, item.result.kept ? item.file.type : outputType(item.file, opts.format)),
    )
  }

  if (!items.length) {
    return (
      <div className="space-y-6">
        <FileDrop accept={ACCEPT} multiple label={t('Tarik gambar ke sini', 'Drop images here')} onFiles={add} />
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'JPG, PNG, WebP, GIF, BMP — bisa banyak sekaligus. Metadata seperti lokasi GPS ikut dihapus.',
            'JPG, PNG, WebP, GIF, BMP — many at once. Metadata like GPS location is removed too.',
          )}
        </p>
      </div>
    )
  }

  const done = items.filter((i) => i.result && i.doneFor === optsKey)
  const before = done.reduce((n, i) => n + i.file.size, 0)
  const after = done.reduce((n, i) => n + i.result!.blob.size, 0)
  const failed = items.filter((i) => i.error)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            {items.length} {t('gambar', items.length === 1 ? 'image' : 'images')}
            {done.length > 0 && (
              <span className="text-muted-foreground">
                {' '}
                · {formatSize(before)} → {formatSize(after)}
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {busy ? (
              t('Mengompres…', 'Compressing…')
            ) : before > 0 ? (
              <>
                {t('Hemat', 'Saved')}{' '}
                <span className="text-gradient font-semibold">
                  {Math.max(0, Math.round((1 - after / before) * 100))}%
                </span>
              </>
            ) : (
              t('Siap', 'Ready')
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void downloadAll()} disabled={busy || !done.length}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {done.length > 1 ? t(`Unduh semua (${done.length})`, `Download all (${done.length})`) : t('Unduh', 'Download')}
          </Button>
          <Button variant="outline" onClick={() => addRef.current?.click()}>
            <Plus />
            {t('Tambah', 'Add')}
          </Button>
          <Button variant="ghost" onClick={() => items.forEach((i) => remove(i.id))}>
            <Trash2 />
            {t('Hapus semua', 'Remove all')}
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
              add(picked)
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
        <Segmented
          label="Format"
          value={opts.format}
          options={FORMAT_OPTIONS.filter((o) => o.value !== 'webp' || canEncodeWebp()).map((o) => ({
            value: o.value,
            label: t(...o.label),
          }))}
          onChange={(format) => setOpts((o) => ({ ...o, format }))}
        />
        <Segmented
          label={t('Ukuran maksimum', 'Max size')}
          value={opts.maxSide}
          options={SIZE_OPTIONS.map((o) => ({ value: o.value, label: t(...o.label) }))}
          onChange={(maxSide) => setOpts((o) => ({ ...o, maxSide }))}
        />
        <label className="min-w-48 flex-1 space-y-2">
          <span className="flex justify-between text-xs font-medium text-muted-foreground">
            {t('Kualitas', 'Quality')} <span className="font-mono text-foreground">{Math.round(opts.quality * 100)}</span>
          </span>
          <input
            type="range"
            min={30}
            max={95}
            step={5}
            value={Math.round(opts.quality * 100)}
            onChange={(e) => setOpts((o) => ({ ...o, quality: Number(e.target.value) / 100 }))}
            className="w-full accent-[var(--brand-2)]"
          />
        </label>
      </div>
      {opts.format === 'same' && items.some((i) => i.file.type === 'image/png') && (
        <p className="text-xs text-muted-foreground">
          {t(
            'PNG disimpan tanpa kompresi kualitas, jadi biasanya hanya mengecil kalau ukurannya diperkecil. Pilih WebP untuk hasil jauh lebih kecil dengan transparansi tetap terjaga.',
            'PNG is saved without quality compression, so it usually only shrinks when you reduce its size. Choose WebP for a much smaller result that keeps transparency.',
          )}
        </p>
      )}

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((item) => {
          const current = item.result && item.doneFor === optsKey ? item.result : null
          const saved = current ? 1 - current.blob.size / item.file.size : 0
          return (
            <li key={item.id} className="flex items-center gap-4 p-3">
              <img src={item.preview} alt="" className="size-14 shrink-0 rounded-lg bg-muted object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.error ? (
                    <span className="text-destructive">
                      {t(
                        'Tidak bisa dibaca browser ini (HEIC hanya terbaca di Safari).',
                        "This browser can't read it (HEIC only opens in Safari).",
                      )}
                    </span>
                  ) : current ? (
                    <>
                      {formatSize(item.file.size)} → {formatSize(current.blob.size)} · {current.width}×{current.height}
                      {current.kept && t(' · sudah optimal, disimpan apa adanya', ' · already optimal, kept as is')}
                    </>
                  ) : (
                    <>
                      {formatSize(item.file.size)} · {t('mengompres…', 'compressing…')}
                    </>
                  )}
                </p>
              </div>
              {current && !current.kept && (
                <span
                  className={cn(
                    'font-mono text-sm font-semibold',
                    saved > 0 ? 'text-gradient' : 'text-muted-foreground',
                  )}
                >
                  {saved > 0 ? `−${Math.round(saved * 100)}%` : `+${Math.round(-saved * 100)}%`}
                </span>
              )}
              <div className="flex">
                <button
                  type="button"
                  aria-label={t('Unduh', 'Download')}
                  disabled={!current}
                  onClick={() => downloadOne(item)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                >
                  <Download className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={t('Hapus', 'Remove')}
                  onClick={() => remove(item.id)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {failed.length > 0 && (
        <ErrorNote
          message={t(
            `${failed.length} gambar tidak bisa dibaca dan dilewati. Foto HEIC dari iPhone hanya terbaca di Safari — ubah ke JPG dulu bila perlu.`,
            `${failed.length} ${failed.length === 1 ? "image couldn't" : "images couldn't"} be read and ${failed.length === 1 ? 'was' : 'were'} skipped. HEIC photos from iPhone only open in Safari — convert them to JPG first if needed.`,
          )}
        />
      )}
    </div>
  )
}
