import { useEffect, useRef, useState } from 'react'
import { Download, Info, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { downloadBlob, withExtension } from '@/lib/download'
import { pageUrl } from '@/lib/route'
import { tr, useLang, useT } from '@/lib/i18n'
import { formatBytes } from '@/lib/image'
import { isHeic } from '../convert-image/heic'
import { imageToDng, type DngResult } from './convert'

interface Item {
  id: number
  file: File
  preview?: string
  progress: number
  result?: DngResult
  error?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/bmp,image/gif,.heic,.heif'

let nextId = 0

export default function ImageToDng() {
  const t = useT()
  const [items, setItems] = useState<Item[]>([])
  const addRef = useRef<HTMLInputElement>(null)
  const pending = items.find((i) => !i.result && !i.error)
  const busy = !!pending

  // One file at a time: a 24 MP photo needs a few hundred MB while it is encoded.
  useEffect(() => {
    if (!pending) return
    let cancelled = false
    const id = pending.id
    const update = (patch: Partial<Item>) => !cancelled && setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    imageToDng(pending.file, (progress) => update({ progress }))
      .then((result) => update({ result, progress: 1 }))
      .catch(() => update({ error: true }))
    return () => {
      cancelled = true
    }
    // Restart only when the file being worked on changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id])

  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), [])

  function add(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/') || isHeic(f))
    setItems((prev) => [
      ...prev,
      ...images.map((file) => ({ id: nextId++, file, progress: 0, preview: isHeic(file) ? undefined : URL.createObjectURL(file) })),
    ])
  }

  function remove(id: number) {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id)
      if (gone?.preview) URL.revokeObjectURL(gone.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  const done = items.filter((i) => i.result)
  const failed = items.filter((i) => i.error)
  const name = (item: Item) => withExtension(item.file.name, '.dng')

  async function downloadAll() {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, name(done[0]))
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const used = new Set<string>()
    for (const item of done) {
      let n = name(item)
      for (let k = 2; used.has(n); k++) n = name(item).replace(/\.dng$/, `-${k}.dng`)
      used.add(n)
      zip.file(n, item.result!.blob, { compression: 'STORE' })
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), tr('gambar-dng', 'dng-images') + '.zip')
  }

  if (!items.length) {
    return (
      <div className="space-y-6">
        <FileDrop accept={ACCEPT} multiple label={t('Tarik gambar ke sini', 'Drop images here')} onFiles={add} />
        <p className="text-center text-xs text-muted-foreground">
          {t('JPG, PNG, WebP, HEIC (foto iPhone) — bisa banyak sekaligus.', 'JPG, PNG, WebP, HEIC (iPhone photos) — many at once.')}
        </p>
        <WhyDng />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          {items.length} {t('gambar', items.length === 1 ? 'image' : 'images')}
          <span className="text-sm text-muted-foreground"> · {busy ? t('Membuat DNG…', 'Making DNG…') : t('Siap', 'Ready')}</span>
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

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 p-3">
            {item.preview ? (
              <img src={item.preview} alt="" className="size-14 shrink-0 rounded-lg bg-muted object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs text-muted-foreground">HEIC</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name(item)}</p>
              <p className="text-xs text-muted-foreground">
                {item.error ? (
                  <span className="text-destructive">{t('Gambar tidak bisa dibaca.', "Can't read this image.")}</span>
                ) : item.result ? (
                  <>
                    {formatBytes(item.file.size)} → {formatBytes(item.result.blob.size)} · {item.result.width}×{item.result.height}
                  </>
                ) : item === pending ? (
                  <>
                    {t('membuat DNG…', 'making DNG…')} <span className="font-mono">{Math.round(item.progress * 100)}%</span>
                  </>
                ) : (
                  t('menunggu…', 'waiting…')
                )}
              </p>
            </div>
            <div className="flex">
              <button
                type="button"
                aria-label={t('Unduh', 'Download')}
                disabled={!item.result}
                onClick={() => item.result && downloadBlob(item.result.blob, name(item))}
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
        ))}
      </ul>

      {failed.length > 0 && (
        <ErrorNote
          message={t(
            `${failed.length} gambar gagal dibaca dan dilewati.`,
            `${failed.length} ${failed.length === 1 ? 'image' : 'images'} could not be read and ${failed.length === 1 ? 'was' : 'were'} skipped.`,
          )}
        />
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          'DNG berisi gambar 16-bit tanpa kompresi lossy, jadi ukurannya jauh lebih besar dari JPG. Area transparan PNG jadi putih.',
          'A DNG holds the picture as 16-bit data with no lossy compression, so it is much larger than the JPG. Transparent PNG areas become white.',
        )}
      </p>
      <WhyDng />
    </div>
  )
}

/** Why there is no "image to ARW": shown to everyone who searched for it. */
function WhyDng() {
  const t = useT()
  const lang = useLang()
  return (
    <div className="flex gap-3 rounded-2xl border bg-card p-4 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-2" />
      <div className="space-y-2 text-muted-foreground">
        <p className="font-medium text-foreground">{t('Mencari JPG ke ARW (atau CR2, NEF)?', 'Looking for JPG to ARW (or CR2, NEF)?')}</p>
        <p>
          {t(
            'ARW adalah file RAW kamera Sony: isinya data mentah sensor kamera tertentu. JPG atau PNG tidak punya data itu, jadi "JPG ke ARW" hanya menghasilkan file palsu yang ditolak Lightroom dan aplikasi lain. DNG adalah format RAW terbuka buatan Adobe yang dibaca Lightroom, Photoshop, Snapseed, darktable, dan RawTherapee — pilihan yang benar kalau kamu ingin mengedit foto dengan alur kerja RAW.',
            'ARW is a Sony camera RAW file: raw sensor data from one specific camera. A JPG or PNG has no such data, so "JPG to ARW" can only produce a fake file that Lightroom and other apps reject. DNG is Adobe’s open RAW format, read by Lightroom, Photoshop, Snapseed, darktable and RawTherapee — the right choice if you want to edit in a RAW workflow.',
          )}
        </p>
        <p>
          {t(
            'Catatan: DNG dari JPG tidak menambah detail atau rentang dinamis yang sudah hilang. Yang kamu dapat adalah file yang bisa diedit di alur RAW tanpa penurunan kualitas lagi saat disimpan.',
            'Note: a DNG made from a JPG cannot bring back detail or dynamic range that is already gone. What you get is a file you can edit in a RAW workflow without losing more quality on save.',
          )}
        </p>
        <p>
          {t('Punya file ARW dan ingin jadi JPG? Pakai ', 'Have an ARW and want a JPG? Use ')}
          <a href={pageUrl('arw-to-jpg', lang)} className="font-medium text-brand-2 underline-offset-4 hover:underline">
            {t('ARW ke JPG', 'ARW to JPG')}
          </a>
          .
        </p>
      </div>
    </div>
  )
}
