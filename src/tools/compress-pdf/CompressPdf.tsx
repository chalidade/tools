import { useState } from 'react'
import { ArrowRight, Download, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { encryptionInfo } from '@/lib/qpdf'
import { compressPdf, type CompressResult, type Level } from './compress'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; bytes: Uint8Array }
  | { kind: 'error'; message: string }

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: 'light', label: 'Ringan' },
  { value: 'medium', label: 'Sedang' },
  { value: 'strong', label: 'Kuat' },
]

const LEVEL_HINT: Record<Level, string> = {
  light: 'Gambar tetap tajam — cocok untuk dicetak.',
  medium: 'Seimbang — enak dibaca di layar, ukuran jauh lebih kecil.',
  strong: 'Paling kecil — gambar mulai terlihat kasar saat diperbesar.',
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function CompressPdf() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<Level>('medium')
  const [stage, setStage] = useState<string | null>(null)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: 'Pilih file berformat .pdf.' })
      return
    }
    setFile(next)
    setResult(null)
    setError(null)
    setStatus({ kind: 'checking' })
    const bytes = new Uint8Array(await next.arrayBuffer())
    if ((await encryptionInfo(bytes)).encrypted) {
      setStatus({
        kind: 'error',
        message: 'PDF ini terproteksi. Buka proteksinya dulu dengan tool “Buka Proteksi PDF”, lalu kompres di sini.',
      })
      return
    }
    setStatus({ kind: 'ready', bytes })
  }

  async function run(bytes: Uint8Array) {
    setError(null)
    setResult(null)
    setStage('Memulai…')
    try {
      setResult(await compressPdf(bytes, level, setStage))
    } catch {
      setError('Gagal mengompres PDF. File mungkin rusak.')
    } finally {
      setStage(null)
    }
  }

  if (status.kind === 'ready' && file) {
    const busy = stage !== null
    const saved = result ? 1 - result.after / result.before : 0

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{busy ? stage : `Ukuran asli ${formatSize(file.size)}`}</p>
          </div>
          <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            File lain
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label="Tingkat kompresi"
            value={level}
            options={LEVEL_OPTIONS}
            disabled={busy}
            onChange={(v) => {
              setLevel(v)
              setResult(null)
            }}
          />
          <p className="max-w-sm text-xs text-muted-foreground">{LEVEL_HINT[level]}</p>
          <Button className="ml-auto" onClick={() => void run(status.bytes)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Kompres
          </Button>
        </div>

        {result && (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
              <div>
                <p className="text-xs text-muted-foreground">Sebelum</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{formatSize(result.before)}</p>
              </div>
              <ArrowRight className="hidden size-5 text-muted-foreground sm:block" />
              <div>
                <p className="text-xs text-muted-foreground">Sesudah</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{formatSize(result.after)}</p>
              </div>
              <p className="text-gradient text-4xl font-semibold tracking-tight sm:text-right">
                {saved > 0.005 ? `−${Math.round(saved * 100)}%` : '±0%'}
              </p>
            </div>
            <div className="h-2 bg-muted">
              <div className="h-full bg-gradient-brand" style={{ width: `${Math.max(2, (result.after / result.before) * 100)}%` }} />
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {saved <= 0.005
                  ? 'PDF ini sudah cukup ringkas — tidak ada yang bisa dikecilkan lagi tanpa merusak isinya.'
                  : result.images.shrunk
                    ? `${result.images.shrunk} dari ${result.images.found} foto diperkecil dan struktur PDF dioptimasi. Teks tetap bisa diseleksi.`
                    : 'Struktur PDF dioptimasi; tidak ada foto yang perlu diperkecil. Isi tidak berubah sama sekali.'}
              </p>
              {saved > 0.005 && (
                <Button
                  onClick={() =>
                    downloadBlob(
                      new Blob([result.output as BlobPart], { type: 'application/pdf' }),
                      file.name.replace(/\.pdf$/i, '') + '-kompres.pdf',
                    )
                  }
                >
                  <Download />
                  Unduh PDF
                </Button>
              )}
            </div>
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
        label="Tarik file .pdf ke sini"
        busyLabel={status.kind === 'checking' ? `Memeriksa ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
