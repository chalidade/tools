import { useState } from 'react'
import { Loader2, LockOpen, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { downloadBlob } from '@/lib/download'
import { encryptionInfo, isPasswordError, runQpdf } from '@/lib/qpdf'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  /** needsPassword: false = opens freely but carries restrictions (print/copy/edit). */
  | { kind: 'ready'; bytes: Uint8Array; needsPassword: boolean }
  | { kind: 'error'; message: string }

export default function UnlockPdf() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: 'Pilih file berformat .pdf.' })
      return
    }
    setFile(next)
    setPassword('')
    setDone(false)
    setError(null)
    setStatus({ kind: 'checking' })
    const bytes = new Uint8Array(await next.arrayBuffer())
    const info = await encryptionInfo(bytes)
    if (!info.encrypted) {
      setStatus({ kind: 'error', message: 'PDF ini tidak terproteksi — tidak ada password atau batasan yang perlu dibuka.' })
      return
    }
    setStatus({ kind: 'ready', bytes, needsPassword: info.needsPassword })
  }

  async function unlock(bytes: Uint8Array, needsPassword: boolean) {
    if (!file || (needsPassword && !password)) return
    setSaving(true)
    setError(null)
    try {
      const { code, log, output } = await runQpdf(bytes, (i, o) => [
        ...(needsPassword ? [`--password=${password}`] : []),
        '--decrypt',
        i,
        o,
      ])
      if (isPasswordError(log)) {
        setError('Password salah. Coba lagi — perhatikan huruf besar/kecil.')
        return
      }
      if (code === 2 || !output) throw new Error('qpdf')
      downloadBlob(new Blob([output as BlobPart], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-terbuka.pdf')
      setDone(true)
    } catch {
      setError('Gagal membuka proteksi. File mungkin rusak atau memakai enkripsi yang tidak didukung.')
    } finally {
      setSaving(false)
    }
  }

  if (status.kind === 'ready' && file) {
    const { bytes, needsPassword } = status
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {done
                ? 'Selesai — PDF tanpa proteksi sudah diunduh.'
                : needsPassword
                  ? 'Terkunci dengan password.'
                  : 'Bisa dibuka, tapi dibatasi (cetak/salin/ubah).'}
            </p>
          </div>
          <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            File lain
          </Button>
        </div>

        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-5">
          {needsPassword ? (
            <PasswordInput
              label="Password PDF"
              value={password}
              onChange={(v) => {
                setPassword(v)
                setError(null)
              }}
              autoFocus
              invalid={!!error}
              autoComplete="current-password"
              onEnter={() => void unlock(bytes, needsPassword)}
            />
          ) : (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              PDF ini tidak butuh password untuk dibuka. Batasan cetak, salin, dan ubahnya akan dihapus.
            </p>
          )}
          <Button size="lg" onClick={() => void unlock(bytes, needsPassword)} disabled={saving || (needsPassword && !password)}>
            {saving ? <Loader2 className="animate-spin" /> : <LockOpen />}
            {needsPassword ? 'Buka & unduh' : 'Hapus batasan & unduh'}
          </Button>
        </div>

        {error && <ErrorNote message={error} />}
        <p className="text-xs text-muted-foreground">
          Gunakan hanya untuk PDF milikmu atau yang memang boleh kamu buka.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label="Tarik PDF yang terproteksi ke sini"
        busyLabel={status.kind === 'checking' ? `Memeriksa ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
