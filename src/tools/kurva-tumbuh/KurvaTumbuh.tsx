import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { locale, useT } from '@/lib/i18n'
import { Segmented } from '@/components/tool/Segmented'
import { num } from '@/tools/cicilan/loan'
import { DAYS_PER_MONTH, MAX_DAYS, bmi, evaluate, valueForZ, type Indicator, type Measure, type Sex, type Tone } from './growth'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
const TONE: Record<Tone, string> = { low: 'text-sky-500', ok: 'text-emerald-500', warn: 'text-amber-500', high: 'text-rose-500' }
const KEY = 'toowl.kurva-tumbuh'

interface Entry {
  date: string
  kg?: number
  cm?: number
  hc?: number
  lying: boolean
}
interface Saved {
  sex: Sex
  birth: string
  list: Entry[]
}

const today = () => new Date().toISOString().slice(0, 10)
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (s && Array.isArray(s.list)) return s
  } catch {
    /* no storage */
  }
  return { sex: 'male', birth: '', list: [] }
}

const NAMES: Record<Measure, [string, string]> = {
  bbu: ['BB/U · berat menurut umur', 'Weight-for-age'],
  tbu: ['TB/U · tinggi menurut umur', 'Length/height-for-age'],
  bbtb: ['BB/TB · berat menurut tinggi', 'Weight-for-length/height'],
  imtu: ['IMT/U · IMT menurut umur', 'BMI-for-age'],
  lku: ['LK/U · lingkar kepala menurut umur', 'Head circumference-for-age'],
}
const CHART: Record<string, { ind: Indicator; unit: string; label: [string, string] }> = {
  bbu: { ind: 'wfa', unit: 'kg', label: ['BB/U', 'W/A'] },
  tbu: { ind: 'lhfa', unit: 'cm', label: ['TB/U', 'L/A'] },
  imtu: { ind: 'bfa', unit: 'kg/m²', label: ['IMT/U', 'BMI/A'] },
  lku: { ind: 'hcfa', unit: 'cm', label: ['LK/U', 'HC/A'] },
}
const Z_LINES = [-3, -2, 0, 2, 3]

export default function KurvaTumbuh() {
  const t = useT()
  const init = useMemo(load, [])
  const [sex, setSex] = useState<Sex>(init.sex)
  const [birth, setBirth] = useState(init.birth)
  const [date, setDate] = useState(today())
  const [kg, setKg] = useState('')
  const [cm, setCm] = useState('')
  const [hc, setHc] = useState('')
  const [lying, setLying] = useState(true)
  const [list, setList] = useState<Entry[]>(init.list)
  const [chart, setChart] = useState<keyof typeof CHART>('bbu')

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ sex, birth, list } satisfies Saved))
    } catch {
      /* no storage */
    }
  }, [sex, birth, list])

  const f1 = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 1 })
  const f2 = (n: number) => n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const ageDays = birth ? dayDiff(birth, date) : NaN
  const ageOk = ageDays >= 0 && ageDays <= MAX_DAYS
  const ageText = ageOk
    ? t(`${Math.floor(ageDays / DAYS_PER_MONTH)} bulan ${Math.round(ageDays - Math.floor(ageDays / DAYS_PER_MONTH) * DAYS_PER_MONTH)} hari`, `${Math.floor(ageDays / DAYS_PER_MONTH)} months ${Math.round(ageDays - Math.floor(ageDays / DAYS_PER_MONTH) * DAYS_PER_MONTH)} days`)
    : ''

  const w = num(kg)
  const h = num(cm)
  const c = num(hc)
  const inRange = (v: number, lo: number, hi: number) => (v >= lo && v <= hi ? v : undefined)
  const input = { kg: inRange(w, 0.5, 40), cm: inRange(h, 30, 130), hc: inRange(c, 20, 60) }
  const results = ageOk ? evaluate({ sex, ageDays, ...input, lying }) : []

  const save = () => {
    if (!ageOk || (!input.kg && !input.cm && !input.hc)) return
    setList((l) => [...l.filter((e) => e.date !== date), { date, ...input, lying }].sort((a, b) => a.date.localeCompare(b.date)))
  }

  // chart
  const cfg = CHART[chart]
  const pts = list
    .map((e) => {
      const d = birth ? dayDiff(birth, e.date) : NaN
      if (!(d >= 0 && d <= MAX_DAYS)) return null
      const v = chart === 'bbu' ? e.kg : chart === 'tbu' ? e.cm : chart === 'lku' ? e.hc : e.kg && e.cm ? bmi(e.kg, e.cm) : undefined
      return v ? { d, v } : null
    })
    .filter((p): p is { d: number; v: number } => !!p)
  const maxDay = Math.min(MAX_DAYS, Math.max(365, ...pts.map((p) => p.d + 120)))
  const steps = Array.from({ length: Math.floor(maxDay / 14) + 1 }, (_, i) => i * 14)
  const curves = Z_LINES.map((z) => ({ z, pts: steps.map((d) => ({ d, v: valueForZ(cfg.ind, sex, d, z) })).filter((p): p is { d: number; v: number } => p.v !== null) }))
  const all = [...curves.flatMap((k) => k.pts.map((p) => p.v)), ...pts.map((p) => p.v)]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const W = 640
  const H = 320
  const pad = { l: 40, r: 12, t: 10, b: 28 }
  const X = (d: number) => pad.l + (d / maxDay) * (W - pad.l - pad.r)
  const Y = (v: number) => H - pad.b - ((v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b)
  const path = (p: { d: number; v: number }[]) => p.map((q, i) => `${i ? 'L' : 'M'}${X(q.d).toFixed(1)},${Y(q.v).toFixed(1)}`).join('')
  const monthTicks = Array.from({ length: Math.floor(maxDay / DAYS_PER_MONTH / 6) + 1 }, (_, i) => i * 6)

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <Segmented
          label={t('Jenis kelamin', 'Sex')}
          value={sex}
          onChange={setSex}
          options={[
            { value: 'male', label: t('Laki-laki', 'Boy') },
            { value: 'female', label: t('Perempuan', 'Girl') },
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Tanggal lahir', 'Date of birth')}
            <input type="date" value={birth} max={today()} onChange={(e) => setBirth(e.target.value)} className={inputCls} />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Tanggal ukur', 'Measured on')}
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
        </div>
        {birth && !ageOk && (
          <p className="text-sm text-amber-500">
            {ageDays < 0 ? t('Tanggal ukur sebelum tanggal lahir.', 'The measurement date is before the birth date.') : t('Standar WHO ini hanya untuk anak 0–5 tahun (60 bulan).', 'These WHO standards cover ages 0–5 years (60 months) only.')}
          </p>
        )}
        {ageOk && <p className="text-sm text-muted-foreground">{t('Umur', 'Age')}: {ageText}</p>}
        <div className="grid grid-cols-3 gap-3">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Berat (kg)', 'Weight (kg)')}
            <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} className={inputCls} placeholder="9,5" />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Panjang/tinggi (cm)', 'Length/height (cm)')}
            <input inputMode="decimal" value={cm} onChange={(e) => setCm(e.target.value)} className={inputCls} placeholder="75" />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Lingkar kepala (cm)', 'Head (cm)')}
            <input inputMode="decimal" value={hc} onChange={(e) => setHc(e.target.value)} className={inputCls} placeholder="46" />
          </label>
        </div>
        <Segmented
          label={t('Cara mengukur panjang/tinggi', 'How length/height was measured')}
          value={lying ? 'lie' : 'stand'}
          onChange={(v) => setLying(v === 'lie')}
          options={[
            { value: 'lie', label: t('Berbaring', 'Lying down') },
            { value: 'stand', label: t('Berdiri', 'Standing') },
          ]}
        />
      </div>

      {results.length > 0 ? (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
          {results.map((r) => (
            <div key={r.measure} className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{t(NAMES[r.measure][0], NAMES[r.measure][1])}</p>
              <p className="tabular-nums">
                <span className="text-lg font-semibold">z = {f2(r.z)}</span>{' '}
                <span className={`font-medium ${TONE[r.cat.tone]}`}>{t(r.cat.label[0], r.cat.label[1])}</span>
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {t('Nilai', 'Value')} {f1(r.value)} · {t('median', 'median')} {f1(r.median)} · {t('persentil', 'percentile')} {f1(r.pct)}
              </p>
              {r.implausible && (
                <p className="text-xs text-amber-500">{t('Angka ini di luar batas wajar WHO — cek lagi apakah ada salah ketik.', 'This is outside WHO plausible limits — check for a typing slip.')}</p>
              )}
            </div>
          ))}
          <button type="button" onClick={save} className="rounded-xl bg-brand-fill px-4 py-2 text-sm font-medium text-brand-ink">
            {t('Simpan ke riwayat (di perangkat ini)', 'Save to history (on this device)')}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Isi tanggal lahir dan minimal satu ukuran untuk melihat z-score.', 'Enter the birth date and at least one measurement to see z-scores.')}</p>
      )}

      {ageOk || pts.length > 0 ? (
        <div className="space-y-3">
          <Segmented
            label={t('Grafik kurva', 'Growth chart')}
            value={chart as string}
            onChange={(v) => setChart(v)}
            options={Object.keys(CHART).map((k) => ({ value: k, label: t(CHART[k].label[0], CHART[k].label[1]) }))}
          />
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl rounded-xl border bg-background" role="img" aria-label={t('Kurva pertumbuhan WHO dengan titik pengukuran', 'WHO growth curves with measurements')}>
            {monthTicks.map((m) => (
              <g key={m}>
                <line x1={X(m * DAYS_PER_MONTH)} x2={X(m * DAYS_PER_MONTH)} y1={pad.t} y2={H - pad.b} className="stroke-border" strokeWidth="1" />
                <text x={X(m * DAYS_PER_MONTH)} y={H - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="11">
                  {m}
                </text>
              </g>
            ))}
            {[0, 1, 2, 3, 4].map((i) => {
              const v = lo + ((hi - lo) * i) / 4
              return (
                <text key={i} x={pad.l - 6} y={Y(v) + 4} textAnchor="end" className="fill-muted-foreground" fontSize="11">
                  {Math.round(v * 10) / 10}
                </text>
              )
            })}
            {curves.map((k) => (
              <g key={k.z}>
                <path d={path(k.pts)} fill="none" className={k.z === 0 ? 'stroke-emerald-500' : Math.abs(k.z) === 3 ? 'stroke-rose-500' : 'stroke-amber-500'} strokeWidth={k.z === 0 ? 2 : 1.2} strokeDasharray={k.z === 0 ? undefined : '4 3'} />
                {k.pts.length > 0 && (
                  <text x={X(k.pts[k.pts.length - 1].d) - 2} y={Y(k.pts[k.pts.length - 1].v) - 3} textAnchor="end" className="fill-muted-foreground" fontSize="10">
                    {k.z > 0 ? `+${k.z}` : k.z}
                  </text>
                )}
              </g>
            ))}
            {pts.length > 1 && <path d={path(pts)} fill="none" className="stroke-foreground" strokeWidth="1.5" />}
            {pts.map((p, i) => (
              <circle key={i} cx={X(p.d)} cy={Y(p.v)} r="4" className="fill-foreground stroke-background" strokeWidth="1.5" />
            ))}
            {ageOk && (() => {
              const v = chart === 'bbu' ? input.kg : chart === 'tbu' ? input.cm : chart === 'lku' ? input.hc : input.kg && input.cm ? bmi(input.kg, input.cm) : undefined
              return v ? <circle cx={X(ageDays)} cy={Y(v)} r="5" className="fill-brand-fill stroke-foreground" strokeWidth="1.5" /> : null
            })()}
          </svg>
          <p className="text-xs text-muted-foreground">
            {t(`Sumbu bawah: umur (bulan). Garis hijau = median, putus-putus = ±2 dan ±3 SD. Satuan: ${cfg.unit}.`, `Bottom axis: age (months). Green = median, dashed = ±2 and ±3 SD. Unit: ${cfg.unit}.`)}
          </p>
        </div>
      ) : null}

      {list.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t('Riwayat pengukuran', 'Measurement history')}</p>
            <button type="button" onClick={() => setList([])} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Trash2 className="size-3.5" /> {t('Hapus semua', 'Clear all')}
            </button>
          </div>
          <table className="w-full max-w-xl text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1 font-medium">{t('Tanggal', 'Date')}</th>
                <th className="py-1 font-medium">kg</th>
                <th className="py-1 font-medium">cm</th>
                <th className="py-1 font-medium">LK</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.date} className="border-t">
                  <td className="py-1">{e.date}</td>
                  <td className="py-1">{e.kg ?? '–'}</td>
                  <td className="py-1">{e.cm ?? '–'}</td>
                  <td className="py-1">{e.hc ?? '–'}</td>
                  <td className="py-1 text-right">
                    <button type="button" aria-label={t('Hapus', 'Delete')} onClick={() => setList((l) => l.filter((x) => x !== e))} className="text-muted-foreground hover:text-foreground">
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Ini alat skrining, bukan diagnosis. Hasil di luar normal perlu diperiksa tenaga kesehatan (posyandu, puskesmas, dokter anak); satu ukuran saja tidak cukup, arah kurva dari waktu ke waktu lebih penting. Memakai Standar Pertumbuhan Anak WHO 0–5 tahun yang menjadi dasar Permenkes 2/2020 (data LMS WHO ada di satu berkas; tabel dijarangkan lalu diinterpolasi, selisih z-score di bawah sekitar 0,01 SD). Panjang diukur berbaring dan tinggi berdiri dikoreksi 0,7 cm di sekitar umur 2 tahun. Riwayat hanya tersimpan di perangkat ini; tidak ada yang dikirim ke mana pun.',
          'This is a screening tool, not a diagnosis. Results outside the normal range need a health worker (posyandu, clinic, paediatrician); one reading is not enough, the trend over time matters more. Uses the WHO Child Growth Standards 0–5 years behind Indonesia’s Permenkes 2/2020 (WHO LMS data in one file; tables thinned then interpolated, z-scores off by under about 0.01 SD). Lying length and standing height are corrected by 0.7 cm around age 2. History stays on this device; nothing is sent anywhere.',
        )}
      </p>
    </div>
  )
}
