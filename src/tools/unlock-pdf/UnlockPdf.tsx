import { useState } from 'react'
import { Loader2, LockOpen, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { encryptionInfo, isPasswordError, runQpdf } from '@/lib/qpdf'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  /** needsPassword: false = opens freely but carries restrictions (print/copy/edit). */
  | { kind: 'ready'; bytes: Uint8Array; needsPassword: boolean }
  | { kind: 'error'; message: string }

export default function UnlockPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
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
      setStatus({
        kind: 'error',
        message: t(
          'PDF ini tidak terproteksi — tidak ada password atau batasan yang perlu dibuka.',
          "This PDF isn't protected — there's no password or restriction to remove.",
        ),
      })
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
        setError(t('Password salah. Coba lagi — perhatikan huruf besar/kecil.', 'Wrong password. Try again — mind upper and lower case.'))
        return
      }
      if (code === 2 || !output) throw new Error('qpdf')
      downloadBlob(
        new Blob([output as BlobPart], { type: 'application/pdf' }),
        file.name.replace(/\.pdf$/i, '') + t('-terbuka.pdf', '-unlocked.pdf'),
      )
      setDone(true)
    } catch {
      setError(
        t(
          'Gagal membuka proteksi. File mungkin rusak atau memakai enkripsi yang tidak didukung.',
          "Couldn't remove the protection. The file may be damaged or use an unsupported encryption.",
        ),
      )
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
                ? t('Selesai — PDF tanpa proteksi sudah diunduh.', 'Done — the unprotected PDF has been downloaded.')
                : needsPassword
                  ? t('Terkunci dengan password.', 'Locked with a password.')
                  : t('Bisa dibuka, tapi dibatasi (cetak/salin/ubah).', 'Opens freely, but is restricted (print/copy/edit).')}
            </p>
          </div>
          <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            {t('File lain', 'Another file')}
          </Button>
        </div>

        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-5">
          {needsPassword ? (
            <PasswordInput
              label={t('Password PDF', 'PDF password')}
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
              {t(
                'PDF ini tidak butuh password untuk dibuka. Batasan cetak, salin, dan ubahnya akan dihapus.',
                "This PDF doesn't need a password to open. Its print, copy and edit restrictions will be removed.",
              )}
            </p>
          )}
          <Button size="lg" onClick={() => void unlock(bytes, needsPassword)} disabled={saving || (needsPassword && !password)}>
            {saving ? <Loader2 className="animate-spin" /> : <LockOpen />}
            {needsPassword ? t('Buka & unduh', 'Unlock & download') : t('Hapus batasan & unduh', 'Remove restrictions & download')}
          </Button>
        </div>

        {error && <ErrorNote message={error} />}
        <p className="text-xs text-muted-foreground">
          {t(
            'Gunakan hanya untuk PDF milikmu atau yang memang boleh kamu buka.',
            "Only use this on your own PDFs or ones you're allowed to open.",
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik PDF yang terproteksi ke sini', 'Drop a protected PDF here')}
        busyLabel={status.kind === 'checking' ? t(`Memeriksa ${file?.name}…`, `Checking ${file?.name}…`) : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
