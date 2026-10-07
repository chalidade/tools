import { useState } from 'react'
import { ArrowRight, Download, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { encryptionInfo } from '@/lib/qpdf'
import { compressPdf, type CompressResult, type Level } from './compress'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; bytes: Uint8Array }
  | { kind: 'error'; message: string }

/** Labels and hints are [Indonesian, English]. */
const LEVEL_OPTIONS: { value: Level; label: readonly [string, string] }[] = [
  { value: 'light', label: ['Ringan', 'Light'] },
  { value: 'medium', label: ['Sedang', 'Medium'] },
  { value: 'strong', label: ['Kuat', 'Strong'] },
]

const LEVEL_HINT: Record<Level, readonly [string, string]> = {
  light: ['Gambar tetap tajam — cocok untuk dicetak.', 'Images stay sharp — good for printing.'],
  medium: ['Seimbang — enak dibaca di layar, ukuran jauh lebih kecil.', 'Balanced — easy to read on screen, much smaller file.'],
  strong: ['Paling kecil — gambar mulai terlihat kasar saat diperbesar.', 'Smallest — images start to look rough when zoomed in.'],
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function CompressPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<Level>('medium')
  const [stage, setStage] = useState<string | null>(null)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
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
        message: t(
          'PDF ini terproteksi. Buka proteksinya dulu dengan tool “Buka Proteksi PDF”, lalu kompres di sini.',
          'This PDF is protected. Remove the protection first with the “Unlock PDF” tool, then compress it here.',
        ),
      })
      return
    }
    setStatus({ kind: 'ready', bytes })
  }

  async function run(bytes: Uint8Array) {
    setError(null)
    setResult(null)
    setStage(t('Memulai…', 'Starting…'))
    try {
      setResult(await compressPdf(bytes, level, setStage))
    } catch {
      setError(t('Gagal mengompres PDF. File mungkin rusak.', "Couldn't compress the PDF. The file may be damaged."))
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
            <p className="text-sm text-muted-foreground">{busy ? stage : t(`Ukuran asli ${formatSize(file.size)}`, `Original size ${formatSize(file.size)}`)}</p>
          </div>
          <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            {t('File lain', 'Another file')}
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label={t('Tingkat kompresi', 'Compression level')}
            value={level}
            options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: t(...o.label) }))}
            disabled={busy}
            onChange={(v) => {
              setLevel(v)
              setResult(null)
            }}
          />
          <p className="max-w-sm text-xs text-muted-foreground">{t(...LEVEL_HINT[level])}</p>
          <Button className="ml-auto" onClick={() => void run(status.bytes)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {t('Kompres', 'Compress')}
          </Button>
        </div>

        {result && (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
              <div>
                <p className="text-xs text-muted-foreground">{t('Sebelum', 'Before')}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{formatSize(result.before)}</p>
              </div>
              <ArrowRight className="hidden size-5 text-muted-foreground sm:block" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Sesudah', 'After')}</p>
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
                  ? t(
                      'PDF ini sudah cukup ringkas — tidak ada yang bisa dikecilkan lagi tanpa merusak isinya.',
                      'This PDF is already compact — nothing more can be shrunk without damaging its content.',
                    )
                  : result.images.shrunk
                    ? t(
                        `${result.images.shrunk} dari ${result.images.found} foto diperkecil dan struktur PDF dioptimasi. Teks tetap bisa diseleksi.`,
                        `${result.images.shrunk} of ${result.images.found} photos shrunk and the PDF structure optimized. Text is still selectable.`,
                      )
                    : t(
                        'Struktur PDF dioptimasi; tidak ada foto yang perlu diperkecil. Isi tidak berubah sama sekali.',
                        'PDF structure optimized; no photos needed shrinking. The content is completely unchanged.',
                      )}
              </p>
              {saved > 0.005 && (
                <Button
                  onClick={() =>
                    downloadBlob(
                      new Blob([result.output as BlobPart], { type: 'application/pdf' }),
                      file.name.replace(/\.pdf$/i, '') + t('-kompres.pdf', '-compressed.pdf'),
                    )
                  }
                >
                  <Download />
                  {t('Unduh PDF', 'Download PDF')}
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
        label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')}
        busyLabel={status.kind === 'checking' ? t(`Memeriksa ${file?.name}…`, `Checking ${file?.name}…`) : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
