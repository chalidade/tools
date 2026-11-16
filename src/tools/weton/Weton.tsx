import { useMemo, useState } from 'react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { BULAN_JAWA, findWeton, fromJdn, HARI, jdn, PASARAN, tanggalJawa, validDate, WUKU, wetonOf } from './weton'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const todayIso = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function parseIso(s: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return y >= 1 && validDate(y, mo, d) ? [y, mo, d] : null
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  )
}

export default function Weton() {
  const t = useT()
  const [mode, setMode] = useState<'date' | 'find'>('date')
  const [date, setDate] = useState(todayIso)
  const [hari, setHari] = useState(5)
  const [pasaran, setPasaran] = useState(0)
  const [from, setFrom] = useState(todayIso)
  const [count, setCount] = useState(12)

  const fmt = (n: number) => {
    const x = fromJdn(n)
    return new Date(Date.UTC(x.y, x.m - 1, x.d)).toLocaleDateString(locale(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
  }
  const hariName = (i: number) => t(HARI[i][0], HARI[i][1])

  const one = useMemo(() => {
    const p = parseIso(date)
    if (!p) return null
    const w = wetonOf(...p)
    return { w, j: tanggalJawa(...p), next: w.jdn + 35 }
  }, [date])

  const list = useMemo(() => {
    const p = parseIso(from)
    return p ? findWeton(hari, pasaran, jdn(...p), count) : []
  }, [from, hari, pasaran, count])

  return (
    <div className="space-y-4">
      <Segmented
        label={t('Mode', 'Mode')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'date', label: t('Tanggal → weton', 'Date → weton') },
          { value: 'find', label: t('Weton → tanggal', 'Weton → dates') },
        ]}
      />

      {mode === 'date' ? (
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t('Tanggal (Masehi)', 'Date (Gregorian)')}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          {one ? (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-3xl font-semibold">
                {hariName(one.w.hari)} {PASARAN[one.w.pasaran]}
              </p>
              <dl className="mt-3">
                <Row k={t('Neptu hari', 'Day neptu')} v={`${hariName(one.w.hari)} = ${one.w.neptuHari}`} />
                <Row k={t('Neptu pasaran', 'Pasaran neptu')} v={`${PASARAN[one.w.pasaran]} = ${one.w.neptuPasaran}`} />
                <Row k={t('Jumlah neptu', 'Total neptu')} v={String(one.w.neptu)} />
                <Row k="Wuku" v={`${WUKU[one.w.wuku]} (${t('hari ke', 'day')} ${one.w.hariDalamWuku + 1})`} />
                <Row
                  k={t('Tanggal Jawa', 'Javanese date')}
                  v={one.j ? `${one.j.day} ${BULAN_JAWA[one.j.month]} ${one.j.year}` : t('tidak tersedia di peramban ini', 'not available in this browser')}
                />
                <Row k={t('Weton berikutnya', 'Next weton')} v={fmt(one.next)} />
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                {t(
                  'Tanggal Jawa dihitung dari kalender Hijriah (tahun Jawa = Hijriah + 512) dan bisa berbeda satu hari dari penetapan keraton. Hanya hitungan kalender, tanpa ramalan.',
                  'The Javanese date comes from the Hijri calendar (Javanese year = Hijri + 512) and can differ by a day from the palace’s official reckoning. Calendar arithmetic only, no fortune-telling.',
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('Pilih tanggal yang valid.', 'Pick a valid date.')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t('Hari', 'Day')}</span>
              <select value={hari} onChange={(e) => setHari(Number(e.target.value))} className={inputCls}>
                {HARI.map((h, i) => (
                  <option key={h[0]} value={i}>
                    {t(h[0], h[1])}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Pasaran</span>
              <select value={pasaran} onChange={(e) => setPasaran(Number(e.target.value))} className={inputCls}>
                {PASARAN.map((p, i) => (
                  <option key={p} value={i}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t('Mulai dari tanggal', 'Starting from')}</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t('Jumlah hasil', 'Number of results')}</span>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputCls}>
                {[6, 12, 24, 52].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(`${hariName(hari)} ${PASARAN[pasaran]} datang tiap 35 hari.`, `${hariName(hari)} ${PASARAN[pasaran]} comes around every 35 days.`)}
          </p>
          <ol className="divide-y rounded-2xl border bg-card">
            {list.map((n, i) => (
              <li key={n} className="flex justify-between gap-4 px-4 py-2 text-sm">
                <span className="text-muted-foreground">{i + 1}</span>
                <span className="font-medium">{fmt(n)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
