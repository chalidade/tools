import { useState } from 'react'
import { Check, Loader2, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { encryptionInfo, runQpdf } from '@/lib/qpdf'
import { cn } from '@/lib/utils'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; bytes: Uint8Array }
  | { kind: 'error'; message: string }

/** Labels are [Indonesian, English]. */
const PERMISSIONS = [
  { key: 'print', label: ['Boleh dicetak', 'Can print'] },
  { key: 'copy', label: ['Boleh salin teks', 'Can copy text'] },
  { key: 'modify', label: ['Boleh diubah', 'Can edit'] },
] as const
type Permission = (typeof PERMISSIONS)[number]['key']

/**
 * The owner password guards the permission flags. The visitor only sets the
 * open password; a random owner password keeps the restrictions from being
 * lifted with the open password alone in readers that honour them.
 */
function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 32)
}

export default function ProtectPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [allowed, setAllowed] = useState<Record<Permission, boolean>>({ print: true, copy: true, modify: false })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setDone(false)
    setError(null)
    setStatus({ kind: 'checking' })
    const bytes = new Uint8Array(await next.arrayBuffer())
    const info = await encryptionInfo(bytes)
    if (info.encrypted) {
      setStatus({
        kind: 'error',
        message: t(
          'PDF ini sudah terproteksi. Buka proteksinya dulu dengan tool “Buka Proteksi PDF”, lalu proteksi ulang di sini.',
          'This PDF is already protected. Remove the protection first with the “Unlock PDF” tool, then protect it again here.',
        ),
      })
      return
    }
    setStatus({ kind: 'ready', bytes })
  }

  const tooShort = password.length > 0 && password.length < 4
  const mismatch = confirm.length > 0 && confirm !== password
  const canSave = password.length >= 4 && confirm === password && !saving

  async function protect(bytes: Uint8Array) {
    if (!file || !canSave) return
    setSaving(true)
    setError(null)
    try {
      const { code, output } = await runQpdf(bytes, (i, o) => [
        i,
        '--encrypt',
        `--user-password=${password}`,
        `--owner-password=${randomPassword()}`,
        '--bits=256', // AES-256, the strongest PDF encryption
        `--print=${allowed.print ? 'full' : 'none'}`,
        `--extract=${allowed.copy ? 'y' : 'n'}`,
        `--modify=${allowed.modify ? 'all' : 'none'}`,
        '--',
        o,
      ])
      if (code === 2 || !output) throw new Error('qpdf')
      downloadBlob(
        new Blob([output as BlobPart], { type: 'application/pdf' }),
        file.name.replace(/\.pdf$/i, '') + t('-terproteksi.pdf', '-protected.pdf'),
      )
      setDone(true)
    } catch {
      setError(t('Gagal memproteksi PDF. File mungkin rusak.', "Couldn't protect the PDF. The file may be damaged."))
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setStatus({ kind: 'idle' })
    setPassword('')
    setConfirm('')
    setDone(false)
    setError(null)
  }

  if (status.kind === 'ready' && file) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {done
                ? t('Selesai — PDF terproteksi sudah diunduh.', 'Done — the protected PDF has been downloaded.')
                : t('Atur password untuk membuka PDF ini.', 'Set a password for opening this PDF.')}
            </p>
          </div>
          <Button variant="ghost" disabled={saving} onClick={reset}>
            <RotateCcw />
            {t('File lain', 'Another file')}
          </Button>
        </div>

        <div className="grid gap-6 rounded-2xl border bg-card p-5 md:grid-cols-2">
          <div className="space-y-4">
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder={t('Minimal 4 karakter', 'At least 4 characters')}
              autoFocus
              invalid={tooShort}
              autoComplete="new-password"
            />
            <PasswordInput
              label={t('Ulangi password', 'Repeat password')}
              value={confirm}
              onChange={setConfirm}
              invalid={mismatch}
              autoComplete="new-password"
              onEnter={() => void protect(status.bytes)}
            />
            {(tooShort || mismatch) && (
              <p className="text-xs text-destructive">
                {tooShort
                  ? t('Password minimal 4 karakter.', 'The password needs at least 4 characters.')
                  : t('Kedua password belum sama.', "The passwords don't match yet.")}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{t('Setelah dibuka, pembaca PDF…', 'Once opened, the reader…')}</p>
            <div className="flex flex-col gap-2">
              {PERMISSIONS.map((p) => {
                const on = allowed[p.key]
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAllowed((a) => ({ ...a, [p.key]: !a[p.key] }))}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      on ? 'border-brand-2/40 bg-brand-2/10' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-4 place-items-center rounded border',
                        on ? 'border-transparent bg-gradient-brand text-white' : 'bg-background',
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {t(p.label[0], p.label[1])}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                'Batasan ini dihormati Adobe Reader, browser, dan kebanyakan aplikasi PDF, tapi tidak semua.',
                'Adobe Reader, browsers and most PDF apps respect these restrictions, but not all of them do.',
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => void protect(status.bytes)} disabled={!canSave}>
            {saving ? <Loader2 className="animate-spin" /> : <Lock />}
            {t('Proteksi & unduh', 'Protect & download')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t(
              'Enkripsi AES-256. Simpan password-nya baik-baik — tanpa password, isi PDF tidak bisa dipulihkan.',
              'AES-256 encryption. Keep the password safe — without it, the PDF’s contents can’t be recovered.',
            )}
          </p>
        </div>

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
