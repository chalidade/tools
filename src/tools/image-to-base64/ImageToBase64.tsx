import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Download, Eraser, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { formatBytes } from '@/lib/image'
import {
  decodeBase64Image,
  fileToDataUrl,
  NotBase64Error,
  snippet,
  withMime,
  type SnippetKind,
} from './base64'

type Mode = 'encode' | 'decode'
const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'encode', label: 'Gambar → Base64' },
  { value: 'decode', label: 'Base64 → Gambar' },
]
const SNIPPET_OPTIONS: { value: SnippetKind; label: string }[] = [
  { value: 'data-url', label: 'Data URL' },
  { value: 'base64', label: 'Base64 saja' },
  { value: 'html', label: 'HTML <img>' },
  { value: 'css', label: 'CSS' },
  { value: 'markdown', label: 'Markdown' },
]

/** Above this, inlining usually costs more than a separate file. */
const INLINE_HINT = 100 * 1024

interface Encoded {
  file: File
  dataUrl: string
  width: number
  height: number
}

export default function ImageToBase64() {
  const [mode, setMode] = useState<Mode>('encode')

  return (
    <div className="space-y-6">
      <Segmented label="Arah" value={mode} options={MODE_OPTIONS} onChange={setMode} />
      {mode === 'encode' ? <Encoder /> : <Decoder />}
    </div>
  )
}

function Encoder() {
  const [encoded, setEncoded] = useState<Encoded | null>(null)
  const [kind, setKind] = useState<SnippetKind>('data-url')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(file: File) {
    setError(null)
    setBusy(true)
    try {
      const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer())
      const dataUrl = withMime(await fileToDataUrl(file), bytes)
      const img = new Image()
      img.src = dataUrl
      await img.decode()
      setEncoded({ file, dataUrl, width: img.naturalWidth, height: img.naturalHeight })
    } catch {
      setError('File ini bukan gambar yang bisa dibaca browser.')
    } finally {
      setBusy(false)
    }
  }

  // Paste an image straight from the clipboard (e.g. a screenshot).
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) void open(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  if (!encoded) {
    return (
      <div className="space-y-4">
        <FileDrop
          accept="image/*,.svg,.ico"
          label="Tarik gambar ke sini"
          busyLabel={busy ? 'Membaca gambar…' : undefined}
          onFiles={([f]) => void open(f)}
        />
        <p className="text-center text-xs text-muted-foreground">
          Atau tempel gambar dari clipboard (Ctrl/⌘ + V). Byte gambar disalin apa adanya — kualitas tidak berubah.
        </p>
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  const out = snippet(kind, encoded.dataUrl, encoded.file.name)
  const base64Size = encoded.dataUrl.length - encoded.dataUrl.indexOf(',') - 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-muted/60 p-1.5">
          <img src={encoded.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{encoded.file.name}</p>
          <p className="text-sm text-muted-foreground">
            {encoded.width} × {encoded.height} px · {formatBytes(encoded.file.size)} → Base64{' '}
            {formatBytes(base64Size)} (+{Math.round((base64Size / Math.max(1, encoded.file.size) - 1) * 100)}%)
          </p>
        </div>
        <Button variant="ghost" onClick={() => setEncoded(null)}>
          <RotateCcw />
          Gambar lain
        </Button>
      </div>

      {encoded.file.size > INLINE_HINT && (
        <p className="text-xs text-muted-foreground">
          Gambar di atas 100 KB biasanya lebih baik disimpan sebagai file terpisah: Base64 sepertiga lebih besar dan tidak
          ikut di-cache browser.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <Segmented label="Format" value={kind} options={SNIPPET_OPTIONS} onChange={setKind} />
          <div className="flex gap-1">
            <CopyButton text={out} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadBlob(new Blob([out], { type: 'text/plain' }), encoded.file.name.replace(/\.[^.]+$/, '') + '.txt')}
            >
              <Download />
              Unduh .txt
            </Button>
          </div>
        </div>
        <textarea
          readOnly
          value={out}
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          className="h-64 w-full resize-none break-all bg-transparent p-4 font-mono text-xs leading-5 outline-none"
        />
      </div>
    </div>
  )
}

function Decoder() {
  const [input, setInput] = useState('')
  const source = useDeferredValue(input)

  const result = useMemo(() => {
    if (!source.trim()) return null
    try {
      return { ok: true as const, ...decodeBase64Image(source) }
    } catch (e) {
      return {
        ok: false as const,
        message:
          e instanceof NotBase64Error
            ? 'Ini bukan Base64 yang valid. Tempel data URL (data:image/…;base64,…) atau teks Base64-nya saja.'
            : 'Base64-nya valid, tapi isinya bukan gambar yang dikenal (PNG, JPG, GIF, WebP, AVIF, BMP, ICO, SVG).',
      }
    }
  }, [source])

  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!result?.ok) return setUrl(null)
    const next = URL.createObjectURL(result.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [result])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-1.5 text-xs text-muted-foreground">
          <span>Base64 atau data URL</span>
          <Button variant="ghost" size="sm" disabled={!input} onClick={() => setInput('')}>
            <Eraser />
            Bersihkan
          </Button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="data:image/png;base64,iVBORw0KGgo…"
          className="h-80 w-full resize-none break-all bg-transparent p-4 font-mono text-xs leading-5 outline-none"
        />
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-1.5 text-xs text-muted-foreground">
          <span>
            {result?.ok ? `${result.mime} · ${formatBytes(result.size)}` : 'Gambar'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!result?.ok}
            onClick={() => result?.ok && downloadBlob(result.blob, `gambar.${result.ext}`)}
          >
            <Download />
            Unduh
          </Button>
        </div>
        <div className="grid h-80 place-items-center p-4">
          {result && !result.ok ? (
            <ErrorNote message={result.message} />
          ) : url ? (
            <img
              src={url}
              alt="Hasil"
              className="max-h-full max-w-full object-contain [background:repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)_0_0/16px_16px]"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Gambar muncul di sini secara otomatis.</p>
          )}
        </div>
      </div>
    </div>
  )
}
