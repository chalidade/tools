import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Loader2, LayoutGrid, RotateCcw, RotateCw, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import { cn } from '@/lib/utils'
import { moveItem, organizePdf, rotateBy, type PageItem } from './organize'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready' }
  | { kind: 'error'; message: string }

export default function OrganizePdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [thumbs, setThumbs] = useState<PageThumb[]>([])
  const [items, setItems] = useState<PageItem[]>([])
  const [dragId, setDragId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextId = useRef(0)

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setError(null)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const { thumbs: ts } = await pageThumbs(next, 260, (done, total) => setStatus({ kind: 'reading', done, total }))
      setThumbs(ts)
      setItems(ts.map((_, src) => ({ id: nextId.current++, src, turn: 0 })))
      setStatus({ kind: 'ready' })
    } catch (e) {
      setStatus({ kind: 'error', message: openErrorMessage(e) })
    }
  }

  const reset = () => setItems(thumbs.map((_, src) => ({ id: nextId.current++, src, turn: 0 })))
  const update = (id: number, fn: (i: PageItem) => PageItem) => setItems((l) => l.map((i) => (i.id === id ? fn(i) : i)))
  const move = (index: number, to: number) => setItems((l) => moveItem(l, index, to))
  const duplicate = (index: number) =>
    setItems((l) => {
      const copy = { ...l[index], id: nextId.current++ }
      return [...l.slice(0, index + 1), copy, ...l.slice(index + 1)]
    })
  const remove = (id: number) => setItems((l) => l.filter((i) => i.id !== id))

  async function save() {
    if (!file || !items.length) return
    setError(null)
    setSaving(true)
    try {
      downloadBlob(await organizePdf(file, items), file.name.replace(/\.pdf$/i, '') + '-diatur.pdf')
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (status.kind === 'ready' && file) {
    const changed =
      items.length !== thumbs.length || items.some((i, n) => i.src !== n || i.turn !== 0)
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                `${items.length} dari ${thumbs.length} halaman. Seret untuk mengubah urutan.`,
                `${items.length} of ${thumbs.length} pages. Drag to reorder.`,
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving || !items.length}>
              {saving ? <Loader2 className="animate-spin" /> : <LayoutGrid />}
              {t('Simpan PDF', 'Save PDF')}
            </Button>
            <Button variant="outline" disabled={saving || !changed} onClick={reset}>
              <Undo2 />
              {t('Kembalikan', 'Reset')}
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        {error && <ErrorNote message={error} />}
        {!items.length && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t('Semua halaman dihapus. Tekan “Kembalikan” untuk mulai lagi.', 'Every page was removed. Press “Reset” to start over.')}
          </p>
        )}

        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item, i) => (
            <li
              key={item.id}
              draggable={!saving}
              onDragStart={(e) => {
                setDragId(item.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragId !== null && dragId !== item.id) {
                  const from = items.findIndex((x) => x.id === dragId)
                  if (from >= 0) move(from, i)
                }
              }}
              onDragEnd={() => setDragId(null)}
              className={cn(
                'flex cursor-grab flex-col rounded-2xl border bg-card p-3 transition-shadow active:cursor-grabbing',
                dragId === item.id ? 'opacity-40' : 'hover:shadow-lg hover:shadow-brand-2/10',
              )}
            >
              <div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl bg-muted/60 p-2">
                <img
                  src={thumbs[item.src].src}
                  alt={t(`Halaman ${item.src + 1}`, `Page ${item.src + 1}`)}
                  draggable={false}
                  className="max-h-full max-w-full select-none rounded-sm shadow-md ring-1 ring-black/5 transition-transform"
                  style={{
                    transform: `rotate(${item.turn}deg)${item.turn % 180 ? ` scale(${Math.min(1, thumbs[item.src].width / thumbs[item.src].height)})` : ''}`,
                  }}
                />
                <span className="absolute right-2 bottom-2 rounded-md bg-background/90 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                  {t('asli', 'orig.')} {item.src + 1}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-gradient-brand font-mono text-[11px] font-medium text-white">
                  {i + 1}
                </span>
                <div className="ml-auto flex">
                  <IconButton label={t('Putar kiri', 'Rotate left')} disabled={saving} onClick={() => update(item.id, (x) => ({ ...x, turn: rotateBy(x.turn, -90) }))}>
                    <RotateCcw />
                  </IconButton>
                  <IconButton label={t('Putar kanan', 'Rotate right')} disabled={saving} onClick={() => update(item.id, (x) => ({ ...x, turn: rotateBy(x.turn, 90) }))}>
                    <RotateCw />
                  </IconButton>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex">
                  <IconButton label={t('Pindah ke kiri', 'Move left')} disabled={saving || i === 0} onClick={() => move(i, i - 1)}>
                    <ChevronLeft />
                  </IconButton>
                  <IconButton label={t('Pindah ke kanan', 'Move right')} disabled={saving || i === items.length - 1} onClick={() => move(i, i + 1)}>
                    <ChevronRight />
                  </IconButton>
                </div>
                <div className="flex">
                  <IconButton label={t('Duplikat halaman', 'Duplicate page')} disabled={saving} onClick={() => duplicate(i)}>
                    <Copy />
                  </IconButton>
                  <IconButton label={t('Hapus halaman', 'Delete page')} disabled={saving} onClick={() => remove(item.id)}>
                    <Trash2 />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')}
        busyLabel={
          status.kind === 'reading'
            ? t(
                `Membuat pratinjau… ${status.done}/${status.total || '?'}`,
                `Rendering previews… ${status.done}/${status.total || '?'}`,
              )
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
