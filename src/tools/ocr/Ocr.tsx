import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, ScanText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { decodeImage, newCanvas } from '@/lib/image'
import type { OcrLang } from './engine'

interface Item {
  id: number
  file: File
  url: string
}

let nextId = 0
/** Longest side fed to Tesseract: big enough for small print, small enough for phones. */
const MAX_SIDE = 3000

export default function Ocr() {
  const t = useT()
  const [items, setItems] = useState<Item[]>([])
  const [lang, setLang] = useState<OcrLang>('ind+eng')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const stop = useRef(false)

  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(
    () => () => {
      stop.current = true
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url))
    },
    [],
  )

  function add(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    setItems((prev) => [...prev, ...images.map((file) => ({ id: nextId++, file, url: URL.createObjectURL(file) }))])
  }

  function remove(id: number) {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id)
      if (gone) URL.revokeObjectURL(gone.url)
      return prev.filter((i) => i.id !== id)
    })
  }

  async function run() {
    setBusy(true)
    setError('')
    setText('')
    stop.current = false
    let worker: Awaited<ReturnType<typeof import('./engine').createOcr>> | undefined
    try {
      const { createOcr } = await import('./engine')
      setStatus(t('Menyiapkan mesin OCR…', 'Starting the OCR engine…'))
      setProgress(0)
      let index = 0
      worker = await createOcr(lang, (p) => {
        if (p.status === 'recognizing text') {
          setStatus(t(`Membaca foto ${index + 1} dari ${itemsRef.current.length}…`, `Reading photo ${index + 1} of ${itemsRef.current.length}…`))
          setProgress(p.progress)
        }
      })
      const parts: string[] = []
      for (; index < items.length; index++) {
        if (stop.current) return
        const img = await decodeImage(items[index].file)
        const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
        const canvas = newCanvas(img.width * k, img.height * k)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#fff' // transparent PNGs would otherwise read as black
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height)
        img.close()
        const { data } = await worker.recognize(canvas)
        parts.push(data.text.trim())
        setText(parts.join('\n\n'))
      }
      if (!parts.some(Boolean)) setError(t('Tidak ada teks yang terbaca. Coba foto yang lebih tajam dan lurus.', 'No text could be read. Try a sharper, straighter photo.'))
    } catch {
      if (!stop.current) setError(t('OCR gagal dijalankan. Muat ulang halaman lalu coba lagi.', 'OCR failed to run. Reload the page and try again.'))
    } finally {
      await worker?.terminate().catch(() => {})
      if (!stop.current) {
        setBusy(false)
        setStatus('')
      }
    }
  }

  if (!items.length) {
    return (
      <div className="space-y-6">
        <FileDrop accept="image/*,.heic,.heif" multiple label={t('Tarik foto berisi teks ke sini', 'Drop photos with text here')} onFiles={add} />
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'Foto atau tangkapan layar dokumen, struk, atau buku. Mesin OCR (±8 MB) baru diunduh saat kamu menekan Baca teks, dan berjalan di perangkatmu.',
            'Photos or screenshots of documents, receipts or books. The OCR engine (~8 MB) is only downloaded when you press Read text, and runs on your device.',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <div key={i.id} className="group relative size-20 overflow-hidden rounded-lg border bg-muted">
            <img src={i.url} alt={i.file.name} className="size-full object-cover" />
            {!busy && (
              <button
                type="button"
                aria-label={t('Hapus', 'Remove')}
                onClick={() => remove(i.id)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        ))}
        <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground hover:text-foreground">
          + {t('Tambah', 'Add')}
          <input
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              add(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Bahasa teks', 'Text language')}
          value={lang}
          disabled={busy}
          options={[
            { value: 'ind+eng', label: t('Indonesia + Inggris', 'Indonesian + English') },
            { value: 'ind', label: t('Indonesia', 'Indonesian') },
            { value: 'eng', label: t('Inggris', 'English') },
          ]}
          onChange={setLang}
        />
        <Button onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ScanText />}
          {t('Baca teks', 'Read text')}
        </Button>
      </div>

      {busy && (
        <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
          <p>{status}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-brand transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}
      {error && <ErrorNote message={error} />}

      {text && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="w-full rounded-xl border bg-card p-4 font-mono text-sm outline-none focus:border-brand-2/60"
            aria-label={t('Hasil teks', 'Recognized text')}
          />
          <div className="flex flex-wrap gap-2">
            <CopyButton text={text} variant="outline" />
            <Button variant="outline" size="sm" onClick={() => downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), tr('hasil-ocr.txt', 'ocr-text.txt'))}>
              <Download />
              {t('Unduh TXT', 'Download TXT')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Hasil OCR bisa keliru pada tulisan tangan atau foto buram — periksa dan ubah langsung di kotak di atas.', 'OCR can misread handwriting or blurry photos — check and edit right in the box above.')}
          </p>
        </div>
      )}
    </div>
  )
}
