import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { canvasBlob, decodeImage, formatBytes, newCanvas } from '@/lib/image'
import { RAW_EXTENSIONS, canDecodeFully, decodeRaw, isRaw } from './raw'

type Target = 'image/jpeg' | 'image/png'

interface Result {
  blob: Blob
  url: string
  width: number
  height: number
  camera?: string
  /** Only the camera's embedded JPG preview could be used. */
  preview: boolean
}

interface Item {
  id: number
  file: File
  result?: Result
  doneFor?: string
  error?: boolean
}

const ACCEPT = RAW_EXTENSIONS.map((e) => '.' + e).join(',')
const FORMATS: { value: Target; label: string }[] = [
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/png', label: 'PNG' },
]

let nextId = 0

async function convert(file: File, target: Target, quality: number, half: boolean): Promise<Omit<Result, 'url'>> {
  const decoded = await decodeRaw(file, { half })
  let canvas: HTMLCanvasElement
  if (decoded.kind === 'pixels') {
    canvas = newCanvas(decoded.image.width, decoded.image.height)
    canvas.getContext('2d')!.putImageData(decoded.image, 0, 0)
  } else {
    const img = await decodeImage(new File([decoded.blob], 'preview.jpg', { type: 'image/jpeg' }))
    try {
      canvas = newCanvas(img.width, img.height)
      canvas.getContext('2d')!.drawImage(img.source, 0, 0)
    } finally {
      img.close()
    }
  }
  const blob = await canvasBlob(canvas, target, target === 'image/jpeg' ? quality : undefined)
  return { blob, width: canvas.width, height: canvas.height, camera: decoded.camera, preview: decoded.kind === 'preview' }
}

export default function ArwToJpg() {
  const t = useT()
  const [items, setItems] = useState<Item[]>([])
  const [target, setTarget] = useState<Target>('image/jpeg')
  const [quality, setQuality] = useState(0.92)
  const [half, setHalf] = useState(false)
  const [busy, setBusy] = useState(false)
  const addRef = useRef<HTMLInputElement>(null)
  const full = canDecodeFully()
  const key = `${target}|${target === 'image/png' ? 0 : quality}|${half}`
  const ext = target === 'image/png' ? '.png' : '.jpg'

  // Develop whatever is out of date, one file at a time (a RAW needs a few hundred MB).
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
        const out = await convert(pending.file, target, quality, half)
        const result = { ...out, url: URL.createObjectURL(out.blob) }
        if (cancelled) return URL.revokeObjectURL(result.url)
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== pending.id) return i
            if (i.result) URL.revokeObjectURL(i.result.url)
            return { ...i, result, doneFor: key }
          }),
        )
      } catch {
        if (!cancelled) setItems((prev) => prev.map((i) => (i.id === pending.id ? { ...i, error: true } : i)))
      }
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [items, key, target, quality, half])

  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => itemsRef.current.forEach((i) => i.result && URL.revokeObjectURL(i.result.url)), [])

  function add(files: File[]) {
    const raws = files.filter(isRaw)
    setItems((prev) => [...prev, ...raws.map((file) => ({ id: nextId++, file }))])
  }

  function remove(id: number) {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id)
      if (gone?.result) URL.revokeObjectURL(gone.result.url)
      return prev.filter((i) => i.id !== id)
    })
  }

  const done = items.filter((i) => i.result && i.doneFor === key)
  const failed = items.filter((i) => i.error)
  const previews = done.filter((i) => i.result!.preview)

  async function downloadAll() {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, withExtension(done[0].file.name, ext))
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const used = new Set<string>()
    for (const item of done) {
      let name = withExtension(item.file.name, ext)
      for (let n = 2; used.has(name); n++) name = withExtension(item.file.name, `-${n}${ext}`)
      used.add(name)
      zip.file(name, item.result!.blob, { compression: 'STORE' })
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), tr('foto-raw', 'raw-photos') + '.zip')
  }

  if (!items.length) {
    return (
      <div className="space-y-6">
        <FileDrop accept={ACCEPT} multiple label={t('Tarik file ARW ke sini', 'Drop ARW files here')} onFiles={add} />
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'ARW (Sony), juga CR2/CR3 (Canon), NEF (Nikon), RAF (Fujifilm), ORF, RW2, DNG — bisa banyak sekaligus.',
            'ARW (Sony), plus CR2/CR3 (Canon), NEF (Nikon), RAF (Fujifilm), ORF, RW2, DNG — many at once.',
          )}
        </p>
        {!full && <PreviewOnlyNote />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          {items.length} {t('foto', items.length === 1 ? 'photo' : 'photos')}
          <span className="text-sm text-muted-foreground"> · {busy ? t('Memproses RAW…', 'Developing RAW…') : t('Siap', 'Ready')}</span>
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
        <Segmented label={t('Simpan sebagai', 'Save as')} value={target} options={FORMATS} onChange={setTarget} />
        {full && (
          <Segmented
            label={t('Ukuran', 'Size')}
            value={half ? 'half' : 'full'}
            options={[
              { value: 'full', label: t('Penuh', 'Full') },
              { value: 'half', label: t('Setengah (cepat)', 'Half (fast)') },
            ]}
            onChange={(v) => setHalf(v === 'half')}
          />
        )}
        {target === 'image/jpeg' && (
          <label className="min-w-48 flex-1 space-y-2">
            <span className="flex justify-between text-xs font-medium text-muted-foreground">
              {t('Kualitas', 'Quality')} <span className="font-mono text-foreground">{Math.round(quality * 100)}</span>
            </span>
            <input
              type="range"
              min={60}
              max={100}
              step={2}
              value={Math.round(quality * 100)}
              onChange={(e) => setQuality(Number(e.target.value) / 100)}
              className="w-full accent-[var(--brand-2)]"
            />
          </label>
        )}
      </div>

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((item) => {
          const current = item.result && item.doneFor === key ? item.result : null
          return (
            <li key={item.id} className="flex items-center gap-4 p-3">
              {item.result ? (
                <img src={item.result.url} alt="" className="size-14 shrink-0 rounded-lg bg-muted object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs text-muted-foreground uppercase">
                  {item.file.name.split('.').pop()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.error ? (
                    <span className="text-destructive">{t('Bukan file RAW yang bisa dibaca.', 'Not a RAW file this tool can read.')}</span>
                  ) : current ? (
                    <>
                      {formatBytes(item.file.size)} → {formatBytes(current.blob.size)} · {current.width}×{current.height}
                      {current.camera && <> · {current.camera}</>}
                      {current.preview && <> · {t('pratinjau kamera', 'camera preview')}</>}
                    </>
                  ) : (
                    <>
                      {formatBytes(item.file.size)} · {t('memproses…', 'developing…')}
                    </>
                  )}
                </p>
              </div>
              <div className="flex">
                <button
                  type="button"
                  aria-label={t('Unduh', 'Download')}
                  disabled={!current}
                  onClick={() => current && downloadBlob(current.blob, withExtension(item.file.name, ext))}
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
            `${failed.length} file tidak bisa dibaca dan dilewati. Mungkin bukan RAW, rusak, atau dari kamera yang belum didukung.`,
            `${failed.length} ${failed.length === 1 ? 'file' : 'files'} could not be read and ${failed.length === 1 ? 'was' : 'were'} skipped. It may not be a RAW file, be damaged, or come from an unsupported camera.`,
          )}
        />
      )}
      {(!full || previews.length > 0) && <PreviewOnlyNote />}
      {full && (
        <p className="text-xs text-muted-foreground">
          {t(
            'Warna diproses dari data sensor dengan white balance dari kamera. Foto 24 MP butuh beberapa detik per file.',
            'Colours are developed from the sensor data with the white balance set on the camera. A 24 MP photo takes a few seconds per file.',
          )}
        </p>
      )}
    </div>
  )
}

function PreviewOnlyNote() {
  const t = useT()
  return (
    <p className="rounded-2xl border bg-card p-4 text-xs text-muted-foreground">
      {t(
        'Browser ini belum bisa memproses data sensor RAW di halaman ini, jadi yang diambil adalah pratinjau JPG bawaan kamera (biasanya lebih kecil, mis. 1616×1080 di Sony). Untuk ukuran penuh, buka di Chrome atau Edge.',
        'This browser cannot develop RAW sensor data on this page, so the JPG preview stored by the camera is used instead (usually smaller, e.g. 1616×1080 on Sony). For full size, open it in Chrome or Edge.',
      )}
    </p>
  )
}
