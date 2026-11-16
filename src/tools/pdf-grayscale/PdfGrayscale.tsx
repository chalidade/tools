import { useRef, useState } from 'react'
import { Download, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard, SizeResult } from '@/components/tool/SizeResult'
import { downloadBlob, withExtension } from '@/lib/download'
import { isPdfFile, openErrorMessage } from '@/lib/pdf-doc'
import { useT } from '@/lib/i18n'
import { grayscalePdf, type GrayMode } from './gray'

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; done: number; total: number; startedAt: number }
  | { kind: 'done'; blob: Blob }

export default function PdfGrayscale() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<GrayMode>('gray')
  const [threshold, setThreshold] = useState(150)
  const [whiteBg, setWhiteBg] = useState(true)
  const [dpi, setDpi] = useState(150)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const signal = useRef({ cancelled: false })

  async function run(f: File) {
    setError(null)
    signal.current = { cancelled: false }
    setPhase({ kind: 'working', done: 0, total: 1, startedAt: Date.now() })
    const startedAt = Date.now()
    try {
      const blob = await grayscalePdf(f, { mode, threshold, whiteBg }, dpi, (done, total) => setPhase({ kind: 'working', done, total, startedAt }), signal.current)
      setPhase({ kind: 'done', blob })
    } catch (e) {
      setPhase({ kind: 'idle' })
      if (!signal.current.cancelled) setError(openErrorMessage(e))
    }
  }

  function pick(f: File) {
    if (!isPdfFile(f)) {
      setError(t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.'))
      return
    }
    setError(null)
    setFile(f)
    setPhase({ kind: 'idle' })
  }

  const busy = phase.kind === 'working'

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDrop accept="application/pdf,.pdf" label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')} onFiles={([f]) => pick(f)} />
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate font-medium">{file.name}</p>
            <Button variant="ghost" disabled={busy} onClick={() => { setFile(null); setPhase({ kind: 'idle' }) }}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
            <Segmented
              label={t('Mode', 'Mode')}
              value={mode}
              disabled={busy}
              options={[
                { value: 'gray', label: t('Abu-abu', 'Grayscale') },
                { value: 'bw', label: t('Hitam-putih', 'Black & white') },
              ]}
              onChange={(v) => { setMode(v); setPhase({ kind: 'idle' }) }}
            />
            <Segmented
              label={t('Resolusi', 'Resolution')}
              value={dpi}
              disabled={busy}
              options={[
                { value: 100, label: t('100 dpi · hemat', '100 dpi · small') },
                { value: 150, label: t('150 dpi · standar', '150 dpi · standard') },
                { value: 200, label: t('200 dpi · tajam', '200 dpi · sharp') },
              ]}
              onChange={(v) => { setDpi(v); setPhase({ kind: 'idle' }) }}
            />
            {mode === 'bw' ? (
              <label className="min-w-40 flex-1 space-y-2 text-xs font-medium text-muted-foreground">
                {t('Ambang hitam', 'Black threshold')}
                <input type="range" min={60} max={220} value={threshold} disabled={busy} onChange={(e) => { setThreshold(+e.target.value); setPhase({ kind: 'idle' }) }} className="w-full" />
              </label>
            ) : (
              <label className="flex items-center gap-2 self-end text-sm">
                <input type="checkbox" checked={whiteBg} disabled={busy} onChange={(e) => { setWhiteBg(e.target.checked); setPhase({ kind: 'idle' }) }} />
                {t('Latar terang jadi putih', 'Make light backgrounds white')}
              </label>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t(
              'Halaman dirender ulang jadi gambar, jadi teks di hasilnya tidak bisa dipilih atau dicari lagi.',
              'Pages are re-rendered as images, so the text in the result can no longer be selected or searched.',
            )}
          </p>

          {phase.kind === 'working' && (
            <ProgressCard
              label={t(`Mengubah halaman ${phase.done}/${phase.total}…`, `Converting page ${phase.done}/${phase.total}…`)}
              progress={phase.done / phase.total}
              startedAt={phase.startedAt}
              action={
                <Button variant="ghost" size="sm" onClick={() => { signal.current.cancelled = true }}>
                  <X />
                  {t('Batal', 'Cancel')}
                </Button>
              }
            />
          )}

          {phase.kind === 'done' && (
            <SizeResult before={file.size} after={phase.blob.size}>
              <Button onClick={() => downloadBlob(phase.blob, withExtension(file.name, mode === 'bw' ? '-hitam-putih.pdf' : '-abu-abu.pdf'))}>
                <Download />
                {t('Unduh PDF', 'Download PDF')}
              </Button>
            </SizeResult>
          )}

          {phase.kind !== 'done' && (
            <Button disabled={busy} onClick={() => void run(file)}>
              {t('Ubah PDF', 'Convert PDF')}
            </Button>
          )}
        </>
      )}
      {error && <ErrorNote message={error} />}
    </div>
  )
}
