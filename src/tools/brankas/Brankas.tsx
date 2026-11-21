import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileDown, FileUp, Lock, LockOpen, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { downloadBlob } from '@/lib/download'
import { locale, useT } from '@/lib/i18n'
import { deleteRecord, getMeta, getRecords, putRecord, replaceAll, wipe } from './db'
import {
  BadBackupError,
  BadPasswordError,
  MAX_FILE,
  buildBackup,
  createVault,
  openItem,
  parseBackup,
  sealItem,
  unlockVault,
  type Item,
  type Meta,
} from './vault'

type Entry = Omit<Item, 'data'>
const fmt = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function Brankas() {
  const t = useT()
  const [meta, setMeta] = useState<Meta | null | undefined>(undefined) // undefined = loading
  const [key, setKey] = useState<CryptoKey | null>(null)
  const [entries, setEntries] = useState<(Entry & { size: number })[]>([])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const backupInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMeta().then(setMeta, () => {
      setMeta(null)
      setError(t('Penyimpanan browser tidak tersedia (mode privat?). Brankas butuh IndexedDB.', 'Browser storage is unavailable (private mode?). The vault needs IndexedDB.'))
    })
  }, [t])

  const lock = useCallback(() => {
    setKey(null)
    setEntries([])
    setPassword('')
    setConfirm('')
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url)
      return null
    })
  }, [])

  // Lock as soon as the tab is hidden.
  useEffect(() => {
    const onHide = () => document.hidden && lock()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [lock])

  const refresh = useCallback(async (k: CryptoKey) => {
    const recs = await getRecords()
    const list = await Promise.all(
      recs.map(async (r) => {
        const { data, ...rest } = await openItem(k, r)
        return { ...rest, size: data.length }
      }),
    )
    setEntries(list.sort((a, b) => b.added - a.added))
  }, [])

  async function guard(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      if (e instanceof BadPasswordError) setError(t('Password salah, atau data rusak.', 'Wrong password, or the data is damaged.'))
      else if (e instanceof BadBackupError) setError(t('File ini bukan cadangan brankas (formatnya tidak dikenali).', "This isn't a vault backup (format not recognised)."))
      else setError(t('Gagal memproses. Coba lagi.', 'That failed. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const create = () =>
    guard(async () => {
      const { meta: m, key: k } = await createVault(password)
      await replaceAll(m, [])
      setMeta(m)
      setKey(k)
      setEntries([])
      setPassword('')
      setConfirm('')
    })

  const unlock = () =>
    guard(async () => {
      if (!meta) return
      const k = await unlockVault(meta, password)
      await refresh(k)
      setKey(k)
      setPassword('')
    })

  const add = (files: File[]) =>
    guard(async () => {
      if (!key) return
      const big = files.filter((f) => f.size > MAX_FILE)
      if (big.length) setError(t(`Dilewati (lebih dari 25 MB): ${big.map((f) => f.name).join(', ')}`, `Skipped (over 25 MB): ${big.map((f) => f.name).join(', ')}`))
      for (const f of files.filter((f) => f.size <= MAX_FILE)) {
        const data = new Uint8Array(await f.arrayBuffer())
        await putRecord(await sealItem(key, { name: f.name, type: f.type || 'application/octet-stream', added: Date.now(), data }))
      }
      await refresh(key)
    })

  const read = async (id: string) => {
    const rec = (await getRecords()).find((r) => r.id === id)
    if (!key || !rec) throw new Error()
    return openItem(key, rec)
  }

  const save = (id: string) =>
    guard(async () => {
      const it = await read(id)
      downloadBlob(new Blob([it.data as BlobPart], { type: it.type }), it.name)
    })

  const view = (id: string) =>
    guard(async () => {
      const it = await read(id)
      if (preview) URL.revokeObjectURL(preview.url)
      setPreview({ url: URL.createObjectURL(new Blob([it.data as BlobPart], { type: it.type })), name: it.name })
    })

  const remove = (e: Entry) =>
    guard(async () => {
      if (!key || !confirm_(t(`Hapus "${e.name}" dari brankas?`, `Delete "${e.name}" from the vault?`))) return
      await deleteRecord(e.id)
      await refresh(key)
    })

  const backup = () =>
    guard(async () => {
      if (!meta) return
      const bytes = buildBackup(meta, await getRecords())
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }), `brankas-${new Date().toISOString().slice(0, 10)}.twlvault`)
    })

  const restore = (f: File) =>
    guard(async () => {
      const parsed = parseBackup(new Uint8Array(await f.arrayBuffer()))
      if (!confirm_(t('Memulihkan akan MENGGANTI isi brankas di browser ini dengan isi cadangan, dan password cadangan yang berlaku. Lanjutkan?', "Restoring REPLACES this browser's vault with the backup's contents and its password. Continue?"))) return
      await replaceAll(parsed.meta, parsed.records)
      lock()
      setMeta(parsed.meta)
    })

  const reset = () => {
    if (!confirm_(t('Hapus brankas beserta SEMUA isinya dari browser ini? Tidak bisa dibatalkan (kecuali kamu punya cadangan).', 'Delete the vault and EVERYTHING in it from this browser? This cannot be undone (unless you have a backup).'))) return
    void guard(async () => {
      await wipe()
      lock()
      setMeta(null)
      setUnderstood(false)
    })
  }

  const mismatch = confirm !== '' && confirm !== password
  const canCreate = password.length >= 8 && confirm === password && understood

  if (meta === undefined) return error ? <ErrorNote message={error} /> : null

  return (
    <div className="space-y-6">
      {!meta && (
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            {t(
              'Baca dulu: password tidak pernah disimpan di mana pun, termasuk di situs ini. Kalau lupa, isi brankas TIDAK bisa dibuka lagi oleh siapa pun. Data hanya ada di browser ini; hapus data situs atau ganti perangkat = hilang, jadi buat cadangan.',
              'Read this first: the password is never stored anywhere, including on this site. If you forget it, nobody can open the vault again. Data lives only in this browser; clearing site data or switching device loses it, so make a backup.',
            )}
          </p>
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <PasswordInput label={t('Password brankas (min. 8 karakter)', 'Vault password (min. 8 characters)')} value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordInput label={t('Ulangi password', 'Repeat password')} value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={mismatch} />
            {mismatch && <p className="text-xs text-destructive">{t('Dua password belum sama.', "The two passwords don't match.")}</p>}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
              {t('Saya mengerti: password yang lupa berarti data tidak bisa dibuka.', 'I understand: a forgotten password means the data cannot be opened.')}
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canCreate || busy} onClick={() => void create()}>
              <Lock />
              {busy ? t('Membuat…', 'Creating…') : t('Buat brankas', 'Create vault')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => backupInput.current?.click()}>
              <FileUp />
              {t('Pulihkan dari cadangan', 'Restore from backup')}
            </Button>
          </div>
        </div>
      )}

      {meta && !key && (
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Lock className="size-4" /> {t('Brankas terkunci', 'Vault locked')}
          </p>
          <PasswordInput label={t('Password', 'Password')} value={password} onChange={setPassword} autoComplete="current-password" autoFocus onEnter={() => password && void unlock()} />
          <div className="flex flex-wrap gap-2">
            <Button disabled={!password || busy} onClick={() => void unlock()}>
              <LockOpen />
              {busy ? t('Membuka…', 'Unlocking…') : t('Buka brankas', 'Unlock')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => backupInput.current?.click()}>
              <FileUp />
              {t('Pulihkan dari cadangan', 'Restore from backup')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={reset}>
              <Trash2 />
              {t('Hapus brankas', 'Delete vault')}
            </Button>
          </div>
        </div>
      )}

      {meta && key && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t(`${entries.length} dokumen · terbuka`, `${entries.length} documents · unlocked`)}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => void backup()}>
                <FileDown />
                {t('Cadangkan', 'Back up')}
              </Button>
              <Button onClick={lock}>
                <Lock />
                {t('Kunci sekarang', 'Lock now')}
              </Button>
            </div>
          </div>

          <FileDrop accept="image/*,application/pdf,*/*" multiple label={t('Tarik foto/PDF dokumen ke sini (maks. 25 MB per file)', 'Drop document photos/PDFs here (max 25 MB each)')} busyLabel={busy ? t('Mengenkripsi…', 'Encrypting…') : undefined} onFiles={(f) => void add(f)} />

          {entries.length > 0 && (
            <ul className="divide-y rounded-2xl border bg-card">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(e.size)} · {new Date(e.added).toLocaleDateString(locale())}
                    </p>
                  </div>
                  {/^image\/|pdf$/.test(e.type) && (
                    <Button variant="ghost" size="icon" aria-label={t('Lihat', 'View')} disabled={busy} onClick={() => void view(e.id)}>
                      <Eye />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label={t('Unduh', 'Download')} disabled={busy} onClick={() => void save(e.id)}>
                    <Download />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={t('Hapus', 'Delete')} disabled={busy} onClick={() => void remove(e)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {preview && (
            <div className="space-y-2 rounded-2xl border bg-card p-3">
              <p className="truncate text-sm font-medium">{preview.name}</p>
              {/\.pdf$/i.test(preview.name) ? <iframe src={preview.url} title={preview.name} className="h-[70vh] w-full rounded-lg" /> : <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full rounded-lg object-contain" />}
              <Button variant="ghost" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null) }}>
                {t('Tutup pratinjau', 'Close preview')}
              </Button>
            </div>
          )}
        </>
      )}

      <input
        ref={backupInput}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void restore(f)
        }}
      />

      <p className="text-xs text-muted-foreground">
        {t(
          'AES-256-GCM, kunci dari PBKDF2-SHA-256 (600.000 iterasi, salt acak), IV baru untuk tiap file; nama file ikut dienkripsi. Brankas terkunci otomatis saat tab disembunyikan. Semua berjalan di browser; tidak ada yang dikirim ke mana pun. Cadangan (.twlvault) tetap terenkripsi dan bisa dipulihkan di perangkat lain.',
          'AES-256-GCM, key from PBKDF2-SHA-256 (600,000 iterations, random salt), a fresh IV per file; file names are encrypted too. The vault locks automatically when the tab is hidden. Everything runs in your browser; nothing is sent anywhere. The backup (.twlvault) stays encrypted and can be restored on another device.',
        )}
      </p>
      {error && <ErrorNote message={error} />}
    </div>
  )
}

const confirm_ = (m: string) => window.confirm(m)
