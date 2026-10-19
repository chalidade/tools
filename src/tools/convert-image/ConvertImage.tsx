import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { formatBytes } from '@/lib/image'
import { convertImage, targetName, type Converted, type Target } from './convert'
import { isHeic } from './heic'

interface Item {
  id: number
  file: File
  /** Object URL for the thumbnail; HEIC cannot be shown by most browsers, so it has none. */
  preview?: string
  result?: Converted
  /** The settings `result` was made with; a mismatch means it is out of date. */
  doneFor?: string
  error?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/svg+xml,.heic,.heif,.avif'
const FORMATS: { value: Target; label: string }[] = [
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
]

let nextId = 0

export default function ConvertImage() {
  const t = useT()
  const [items, setItems] = useState<Item[]>([])
  const [target, setTarget] = useState<Target>('image/jpeg')
  const [quality, setQuality] = useState(0.9)
  const [busy, setBusy] = useState(false)
  const addRef = useRef<HTMLInputElement>(null)
  const key = `${target}|${target === 'image/png' ? 0 : quality}`

  // Convert whatever is out of date, one file at a time (HEIC decoding is heavy).
  useEffect(() => {
    let cancelled = false
    const pending = items.find((i) => i.doneFor !== key && !i.error)
    if (!pending) {
      setBusy(false)
      return
    }
    setBusy(true)
    const timer = setTimeout(async () => {
      try {
        const result = await convertImage(pending.file, target, quality)
        if (!cancelled) setItems((prev) => prev.map((i) => (i.id === pending.id ? { ...i, result, doneFor: key } : i)))
      } catch {
        if (!cancelled) setItems((prev) => prev.map((i) => (i.id === pending.id ? { ...i, error: true } : i)))
      }
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [items, key, target, quality])

  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), [])

  function add(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/') || isHeic(f) || /\.avif$/i.test(f.name))
    setItems((prev) => [
      ...prev,
      ...images.map((file) => ({ id: nextId++, file, preview: isHeic(file) ? undefined : URL.createObjectURL(file) })),
    ])
  }

  function remove(id: number) {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id)
      if (gone?.preview) URL.revokeObjectURL(gone.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  const done = items.filter((i) => i.result && i.doneFor === key)

  async function downloadAll() {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, targetName(done[0].file, target))
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const used = new Set<string>()
    for (const item of done) {
      let name = targetName(item.file, target)
      for (let n = 2; used.has(name); n++) name = targetName(item.file, target).replace(/(\.[^.]+)$/, `-${n}$1`)
      used.add(name)
      zip.file(name, item.result!.blob, { compression: 'STORE' })
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), tr('gambar-diubah', 'converted-images') + '.zip')
  }

  if (!items.length) {
    return (
      <div className="space-y-6">
        <FileDrop accept={ACCEPT} multiple label={t('Tarik gambar ke sini', 'Drop images here')} onFiles={add} />
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'HEIC (foto iPhone), WebP, AVIF, PNG, JPG, GIF, BMP, SVG — bisa banyak sekaligus.',
            'HEIC (iPhone photos), WebP, AVIF, PNG, JPG, GIF, BMP, SVG — many at once.',
          )}
        </p>
      </div>
    )
  }

  const failed = items.filter((i) => i.error)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          {items.length} {t('gambar', items.length === 1 ? 'image' : 'images')}
          <span className="text-sm text-muted-foreground">
            {' '}
            · {busy ? t('Mengubah…', 'Converting…') : t('Siap', 'Ready')}
          </span>
        </p>
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
        <Segmented label={t('Ubah ke', 'Convert to')} value={target} options={FORMATS} onChange={setTarget} />
        {target !== 'image/png' && (
          <label className="min-w-48 flex-1 space-y-2">
            <span className="flex justify-between text-xs font-medium text-muted-foreground">
              {t('Kualitas', 'Quality')} <span className="font-mono text-foreground">{Math.round(quality * 100)}</span>
            </span>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={Math.round(quality * 100)}
              onChange={(e) => setQuality(Number(e.target.value) / 100)}
              className="w-full accent-[var(--brand-2)]"
            />
          </label>
        )}
      </div>
      {target === 'image/jpeg' && (
        <p className="text-xs text-muted-foreground">
          {t('JPG tidak punya transparansi — area transparan jadi putih.', 'JPG has no transparency — transparent areas become white.')}
        </p>
      )}

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((item) => {
          const current = item.result && item.doneFor === key ? item.result : null
          return (
            <li key={item.id} className="flex items-center gap-4 p-3">
              {item.preview ? (
                <img src={item.preview} alt="" className="size-14 shrink-0 rounded-lg bg-muted object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  HEIC
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.error ? (
                    <span className="text-destructive">{t('Tidak bisa dibaca atau diubah.', "Can't be read or converted.")}</span>
                  ) : current ? (
                    <>
                      {formatBytes(item.file.size)} → {formatBytes(current.blob.size)} · {current.width}×{current.height}
                    </>
                  ) : (
                    <>
                      {formatBytes(item.file.size)} · {t('mengubah…', 'converting…')}
                    </>
                  )}
                </p>
              </div>
              <div className="flex">
                <button
                  type="button"
                  aria-label={t('Unduh', 'Download')}
                  disabled={!current}
                  onClick={() => current && downloadBlob(current.blob, targetName(item.file, target))}
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
            `${failed.length} gambar gagal diubah dan dilewati. Format ini mungkin tidak didukung browser ini.`,
            `${failed.length} ${failed.length === 1 ? 'image' : 'images'} failed to convert and ${failed.length === 1 ? 'was' : 'were'} skipped. The format may not be supported by this browser.`,
          )}
        />
      )}
    </div>
  )
}
