import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { locale, useT } from '@/lib/i18n'
import { ageOn, birthCandidates, cleanNik, parseNik, parseWilayah, type Wilayah } from './nik'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 font-mono text-lg tracking-wider text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Row({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{k}</dt>
      <dd className="text-right">
        <span className="font-medium">{v}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  )
}

export default function CekNik() {
  const t = useT()
  const [value, setValue] = useState('')
  const [wilayah, setWilayah] = useState<Wilayah | null>(null)

  // The region table (~140 KB) is its own chunk, fetched from this site on first use.
  useEffect(() => {
    let alive = true
    import('./wilayah').then((m) => alive && setWilayah(parseWilayah(m.default)))
    return () => {
      alive = false
    }
  }, [])

  const nik = cleanNik(value)
  const info = useMemo(() => parseNik(nik, wilayah), [nik, wilayah])
  const now = new Date()
  const born = info?.dateValid ? birthCandidates(info, now.getFullYear()) : []
  const fmt = (y: number) =>
    new Date(Date.UTC(y, info!.month - 1, info!.day)).toLocaleDateString(locale(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          {t(
            'Alat ini hanya membaca susunan angka NIK. Ia tidak memastikan NIK terdaftar di Dukcapil, dan NIK yang kamu ketik tidak disimpan maupun dikirim ke mana pun.',
            'This tool only reads how the NIK digits are laid out. It cannot confirm that a NIK is registered with Dukcapil, and the number you type is never stored or sent anywhere.',
          )}
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">{t('NIK (16 digit)', 'NIK (16 digits)')}</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={24}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="3171010101900001"
          className={inputCls}
        />
        <span className="text-xs text-muted-foreground">{nik.length}/16</span>
      </label>

      {nik.length > 0 && !/^\d*$/.test(nik) && <p className="text-sm text-destructive">{t('NIK hanya berisi angka.', 'A NIK has digits only.')}</p>}

      {info && (
        <div className="rounded-2xl border bg-card p-5">
          <dl>
            <Row k={t('Provinsi', 'Province')} v={info.provinceName ?? t('tidak ditemukan', 'not found')} sub={`${t('kode', 'code')} ${info.province}`} />
            <Row
              k={t('Kabupaten/Kota', 'Regency/City')}
              v={info.regencyName ?? t('tidak ditemukan', 'not found')}
              sub={`${t('kode', 'code')} ${info.regency.slice(2)}`}
            />
            <Row
              k={t('Kecamatan', 'District')}
              v={info.districtName ?? t('tidak ditemukan di data 2025', 'not in the 2025 data')}
              sub={`${t('kode', 'code')} ${info.district.slice(4)}`}
            />
            <Row k={t('Jenis kelamin', 'Sex')} v={info.female ? t('Perempuan', 'Female') : t('Laki-laki', 'Male')} sub={info.female ? t('tanggal + 40', 'day + 40') : undefined} />
            {info.dateValid ? (
              born.map((y) => (
                <Row
                  key={y}
                  k={born.length > 1 ? t(`Tanggal lahir (jika ${y < 2000 ? '19xx' : '20xx'})`, `Birth date (if ${y < 2000 ? '19xx' : '20xx'})`) : t('Tanggal lahir', 'Birth date')}
                  v={fmt(y)}
                  sub={t(`usia ${ageOn(y, info.month, info.day, now)} tahun`, `age ${ageOn(y, info.month, info.day, now)}`)}
                />
              ))
            ) : (
              <Row k={t('Tanggal lahir', 'Birth date')} v={t('tidak valid', 'not valid')} sub={`${info.day}/${info.month}/${String(info.yy).padStart(2, '0')}`} />
            )}
            <Row k={t('Nomor urut', 'Serial number')} v={info.sequence} />
          </dl>
          {born.length > 1 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t('NIK hanya menyimpan 2 digit tahun, jadi abadnya tidak bisa dipastikan.', 'A NIK stores only 2 year digits, so the century cannot be told.')}
            </p>
          )}
        </div>
      )}
      {nik.length > 0 && nik.length < 16 && /^\d*$/.test(nik) && (
        <p className="text-sm text-muted-foreground">{t('Lengkapi sampai 16 digit.', 'Enter all 16 digits.')}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {t('Data wilayah: Kepmendagri No 300.2.2-2138 Tahun 2025 (cahyadsn/wilayah, MIT). Kode kecamatan di NIK lama bisa sudah berubah.', 'Region data: Kepmendagri No 300.2.2-2138 of 2025 (cahyadsn/wilayah, MIT). District codes in older NIKs may have changed since.')}
      </p>
    </div>
  )
}
