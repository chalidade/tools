import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Combine, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { downloadBlob } from '@/lib/download'
import { isPdfFile, LockedPdfError } from '@/lib/pdf-doc'
import { tr, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { loadPdfItem, mergePdfs, type PdfItem } from './merge'

const ACCEPT = '.pdf,application/pdf'

function skippedMessage(skipped: { name: string; locked: boolean }[]) {
  const names = skipped.map((s) => s.name)
  const list =
    names.length > 3
      ? `${names.slice(0, 3).join(', ')} ${tr('dan', 'and')} ${names.length - 3} ${tr('lainnya', 'more')}`
      : names.join(', ')
  return skipped.some((s) => s.locked)
    ? tr(
        `${list} dilewati: terkunci password atau tidak bisa dibaca. Buka kuncinya dulu dengan tool “Buka Proteksi PDF”.`,
        `Skipped ${list}: password-protected or unreadable. Unlock it first with the “Unlock PDF” tool.`,
      )
    : tr(`${list} dilewati: bukan PDF atau filenya rusak.`, `Skipped ${list}: not a PDF or the file is damaged.`)
}

export default function MergePdf() {
  const t = useT()
  const [items, setItems] = useState<PdfItem[]>([])
  const [loading, setLoading] = useState(0)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const addRef = useRef<HTMLInputElement>(null)

  async function add(files: File[]) {
    setError(null)
    setLoading((n) => n + files.length)
    const skipped: { name: string; locked: boolean }[] = []
    for (const file of files) {
      try {
        if (!isPdfFile(file)) throw new Error('not pdf')
        const item = await loadPdfItem(file)
        setItems((prev) => [...prev, item])
      } catch (e) {
        skipped.push({ name: file.name, locked: e instanceof LockedPdfError })
      } finally {
        setLoading((n) => n - 1)
      }
    }
    if (skipped.length) setError(skippedMessage(skipped))
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

  async function merge() {
    setError(null)
    setProgress({ done: 0, total: items.length })
    try {
      const blob = await mergePdfs(items, (done, total) => setProgress({ done, total }))
      downloadBlob(blob, tr('gabungan.pdf', 'merged.pdf'))
    } catch (e) {
      setError(
        e instanceof LockedPdfError
          ? tr(
              'Salah satu PDF terkunci password. Buka kuncinya dulu dengan tool “Buka Proteksi PDF”.',
              'One of the PDFs is password-protected. Unlock it first with the “Unlock PDF” tool.',
            )
          : tr('Gagal menggabungkan PDF. Salah satu file mungkin rusak.', "Couldn't merge the PDFs. One of the files may be damaged."),
      )
    } finally {
      setProgress(null)
    }
  }

  const busy = progress !== null
  const totalPages = items.reduce((n, i) => n + i.pages, 0)

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept={ACCEPT}
          multiple
          label={t('Tarik beberapa file .pdf ke sini', 'Drop several .pdf files here')}
          busyLabel={loading ? t(`Membaca ${loading} PDF…`, `Reading ${loading} PDF(s)…`) : undefined}
          onFiles={(files) => void add(files)}
        />
        <p className="text-center text-xs text-muted-foreground">
          {t('Pilih dua file atau lebih — urutannya bisa diatur setelahnya.', 'Choose two or more files — you can set the order afterwards.')}
        </p>
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            {t(`${items.length} file · ${totalPages} halaman`, `${items.length} files · ${totalPages} pages`)}
          </p>
          <p className="text-sm text-muted-foreground">
            {busy
              ? t(`Menggabungkan… file ${progress.done}/${progress.total}`, `Merging… file ${progress.done}/${progress.total}`)
              : loading
                ? t(`Membaca ${loading} PDF lagi…`, `Reading ${loading} more PDF(s)…`)
                : items.length < 2
                  ? t('Tambahkan minimal satu PDF lagi.', 'Add at least one more PDF.')
                  : t('Seret untuk mengatur urutan.', 'Drag to set the order.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void merge()} disabled={busy || loading > 0 || items.length < 2}>
            {busy ? <Loader2 className="animate-spin" /> : <Combine />}
            {t('Gabung & unduh', 'Merge & download')}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => addRef.current?.click()}>
            <Plus />
            {t('Tambah', 'Add')}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setItems([])}>
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
              if (picked.length) void add(picked)
            }}
          />
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
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
            <div className="relative grid flex-1 place-items-center rounded-xl bg-muted/60 p-3">
              <img
                src={item.thumb}
                alt=""
                draggable={false}
                className="max-h-48 select-none rounded-sm shadow-md ring-1 ring-black/5"
              />
              <span className="absolute right-2 bottom-2 rounded-md bg-background/90 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                {t(`${item.pages} hlm`, `${item.pages} pages`)}
              </span>
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
                <IconButton label={t('Pindah ke kiri', 'Move left')} disabled={busy || i === 0} onClick={() => move(item.id, -1)}>
                  <ChevronLeft />
                </IconButton>
                <IconButton label={t('Pindah ke kanan', 'Move right')} disabled={busy || i === items.length - 1} onClick={() => move(item.id, 1)}>
                  <ChevronRight />
                </IconButton>
              </div>
              <IconButton
                label={t('Hapus', 'Remove')}
                disabled={busy}
                onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
              >
                <X />
              </IconButton>
            </div>
          </li>
        ))}

        <li>
          <button
            type="button"
            disabled={busy}
            onClick={() => addRef.current?.click()}
            className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-brand-2/40 hover:text-foreground"
          >
            <Plus className="size-5" />
            {t('Tambah PDF', 'Add PDF')}
          </button>
        </li>
      </ol>
    </div>
  )
}
