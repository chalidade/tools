import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { num } from '@/tools/cicilan/loan'
import { faraid, MAX, netEstate, value, type Frac, type Heir, type Heirs, type Rule, type Share } from './faraid'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Heir names as [Indonesian, English]. */
const NAMES: Record<Heir, readonly [string, string]> = {
  husband: ['Suami', 'Husband'],
  wife: ['Istri', 'Wife'],
  son: ['Anak laki-laki', 'Son'],
  daughter: ['Anak perempuan', 'Daughter'],
  sonsSon: ['Cucu laki-laki (dari anak laki-laki)', "Son's son"],
  sonsDaughter: ['Cucu perempuan (dari anak laki-laki)', "Son's daughter"],
  father: ['Ayah', 'Father'],
  mother: ['Ibu', 'Mother'],
  grandfather: ['Kakek (ayah dari ayah)', 'Paternal grandfather'],
  grandmotherF: ['Nenek (ibu dari ayah)', 'Paternal grandmother'],
  grandmotherM: ['Nenek (ibu dari ibu)', 'Maternal grandmother'],
  fullBrother: ['Saudara laki-laki kandung', 'Full brother'],
  fullSister: ['Saudara perempuan kandung', 'Full sister'],
  paternalBrother: ['Saudara laki-laki seayah', 'Paternal half-brother'],
  paternalSister: ['Saudara perempuan seayah', 'Paternal half-sister'],
  maternalBrother: ['Saudara laki-laki seibu', 'Maternal half-brother'],
  maternalSister: ['Saudara perempuan seibu', 'Maternal half-sister'],
  fullNephew: ['Keponakan laki-laki (anak sdr. lk. kandung)', "Full brother's son"],
  paternalNephew: ['Keponakan laki-laki (anak sdr. lk. seayah)', "Paternal half-brother's son"],
  fullUncle: ['Paman kandung (sdr. lk. ayah)', 'Full paternal uncle'],
  paternalUncle: ['Paman seayah', 'Paternal half-uncle'],
  fullCousin: ['Sepupu laki-laki (anak paman kandung)', "Full uncle's son"],
  paternalCousin: ['Sepupu laki-laki (anak paman seayah)', "Half-uncle's son"],
}

const GROUPS: { title: readonly [string, string]; heirs: Heir[]; more?: boolean }[] = [
  { title: ['Pasangan', 'Spouse'], heirs: ['husband', 'wife'] },
  { title: ['Anak & cucu', 'Children & grandchildren'], heirs: ['son', 'daughter', 'sonsSon', 'sonsDaughter'] },
  { title: ['Orang tua & kakek-nenek', 'Parents & grandparents'], heirs: ['father', 'mother', 'grandfather', 'grandmotherF', 'grandmotherM'] },
  {
    title: ['Saudara', 'Siblings'],
    heirs: ['fullBrother', 'fullSister', 'paternalBrother', 'paternalSister', 'maternalBrother', 'maternalSister'],
  },
  {
    title: ['Kerabat laki-laki lain', 'Other male relatives'],
    heirs: ['fullNephew', 'paternalNephew', 'fullUncle', 'paternalUncle', 'fullCousin', 'paternalCousin'],
    more: true,
  },
]

const RULES: Record<Rule, readonly [string, string]> = {
  'spouse-no-child': ['tidak ada anak/cucu', 'no children or grandchildren'],
  'spouse-child': ['ada anak/cucu', 'there are children or grandchildren'],
  'father-son': ['ada anak/cucu laki-laki', 'there is a son or grandson'],
  'father-daughter': ['1/6 + sisa, karena hanya ada anak/cucu perempuan', '1/6 + residue, as there are only daughters/granddaughters'],
  'mother-third': ['tidak ada anak/cucu dan kurang dari 2 saudara', 'no children and fewer than 2 siblings'],
  'mother-sixth': ['ada anak/cucu atau 2 saudara atau lebih', 'there are children or 2+ siblings'],
  'mother-umariyya': ['1/3 dari sisa setelah bagian suami/istri (Umariyyatain)', 'a third of what is left after the spouse (Umariyyatain)'],
  grandmother: ['1/6, dibagi rata bila dua nenek', '1/6, split if two grandmothers'],
  'daughter-one': ['seorang, tanpa saudara laki-laki', 'alone, with no brother'],
  'daughters-two': ['dua orang atau lebih, tanpa saudara laki-laki', 'two or more, with no brother'],
  sons: ['ashabah: sisa harta, laki-laki 2 bagian, perempuan 1', 'residuary: the rest, a male gets twice a female'],
  'granddaughter-takmila': ['pelengkap 2/3 bersama satu anak perempuan', 'completing 2/3 alongside one daughter'],
  'with-brother': ['ashabah bersama saudara laki-lakinya, 2:1', 'residuary with her brother, 2:1'],
  'with-daughter': ['ashabah bersama anak perempuan (ma‘al ghair)', 'residuary alongside daughters (ma‘al ghair)'],
  'sister-one': ['seorang, tanpa anak dan saudara laki-laki', 'alone, with no children and no brother'],
  'sisters-two': ['dua orang atau lebih, tanpa anak dan saudara laki-laki', 'two or more, with no children and no brother'],
  'paternal-sister-takmila': ['pelengkap 2/3 bersama satu saudari kandung', 'completing 2/3 alongside one full sister'],
  'maternal-one': ['seorang saudara seibu', 'a single maternal sibling'],
  'maternal-many': ['1/3 dibagi rata saudara seibu (laki-laki = perempuan)', '1/3 split equally among maternal siblings'],
  musytarakah: ['musytarakah: 1/3 dibagi rata dengan saudara seibu', 'musytarakah: 1/3 shared equally with the maternal siblings'],
  residuary: ['ashabah: sisa harta', 'residuary: the rest'],
}

const fracText = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`)

function Counter({ heir, count, max, onChange }: { heir: Heir; count: number; max: number; onChange: (n: number) => void }) {
  const t = useT()
  const name = t(...NAMES[heir])
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={count ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'}>{name}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, count - 1))}
          disabled={count === 0}
          aria-label={t(`Kurangi ${name}`, `Fewer: ${name}`)}
          className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-7 text-center font-mono text-sm tabular-nums" aria-live="polite">
          {count}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, count + 1))}
          disabled={count >= max}
          aria-label={t(`Tambah ${name}`, `More: ${name}`)}
          className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function Money({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder="0" />
      {hint && <span className="block font-normal">{hint}</span>}
    </label>
  )
}

export default function KalkulatorWaris() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const pct = (f: Frac) => `${(value(f) * 100).toLocaleString(locale(), { maximumFractionDigits: 2 })}%`
  const [deceased, setDeceased] = useState<'male' | 'female'>('male')
  const [heirs, setHeirs] = useState<Heirs>({})
  const [estate, setEstate] = useState('')
  const [funeral, setFuneral] = useState('')
  const [debts, setDebts] = useState('')
  const [bequest, setBequest] = useState('')

  const money = netEstate(num(estate), num(funeral), num(debts), num(bequest))
  const r = faraid(heirs, deceased)
  const anyone = Object.values(heirs).some((n) => n && n > 0)
  const nameOf = (h: Heir) => t(...NAMES[h])
  const amount = (f: Frac) => money.net * value(f)

  const basisText = (s: Share) => {
    if (s.basis === 'asabah') return t('Ashabah (sisa)', 'Residuary')
    if (s.basis === 'fard+asabah') return `${fracText(s.fard!)} + ${t('sisa', 'residue')}`
    return s.rule === 'musytarakah' ? t('Musytarakah', 'Musytarakah') : fracText(s.fard ?? s.total)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Segmented
            label={t('Yang meninggal', 'The deceased')}
            value={deceased}
            onChange={(g) => {
              setDeceased(g)
              setHeirs(({ husband: _h, wife: _w, ...rest }) => rest)
            }}
            options={[
              { value: 'male', label: t('Laki-laki', 'Male') },
              { value: 'female', label: t('Perempuan', 'Female') },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Money label={t('Total harta peninggalan (Rp)', 'Total estate (Rp)')} value={estate} onChange={setEstate} />
            <Money label={t('Biaya pengurusan jenazah (Rp)', 'Funeral costs (Rp)')} value={funeral} onChange={setFuneral} />
            <Money label={t('Utang almarhum (Rp)', 'Debts of the deceased (Rp)')} value={debts} onChange={setDebts} />
            <Money
              label={t('Wasiat (Rp)', 'Bequest (Rp)')}
              value={bequest}
              onChange={setBequest}
              hint={t('Maks. 1/3, untuk bukan ahli waris.', 'At most 1/3, to non-heirs.')}
            />
          </div>
          {num(estate) > 0 && (
            <div className="rounded-xl border bg-muted/40 p-3 text-sm tabular-nums">
              <div className="flex justify-between gap-3">
                <span>{t('Harta setelah biaya jenazah & utang', 'After funeral costs & debts')}</span>
                <span className="whitespace-nowrap">{rp(money.afterDebts)}</span>
              </div>
              {money.bequest > 0 && (
                <div className="mt-1 flex justify-between gap-3 border-t pt-1">
                  <span>− {t('Wasiat', 'Bequest')}</span>
                  <span className="whitespace-nowrap">{rp(money.bequest)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between gap-3 border-t pt-1 font-medium">
                <span>{t('Harta yang dibagi', 'Estate to divide')}</span>
                <span className="whitespace-nowrap">{rp(money.net)}</span>
              </div>
              {money.bequestCapped && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    'Wasiat melebihi 1/3 harta, jadi dibatasi 1/3. Kelebihannya hanya sah bila semua ahli waris setuju.',
                    'The bequest exceeds a third of the estate, so it is capped at a third. More is valid only if every heir agrees.',
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">{t('Ahli waris yang masih hidup', 'Living heirs')}</p>
          {GROUPS.map((g) => {
            const list = g.heirs.filter((h) => !(h === 'husband' && deceased === 'male') && !(h === 'wife' && deceased === 'female'))
            const body = (
              <div className="divide-y">
                {list.map((h) => (
                  <Counter
                    key={h}
                    heir={h}
                    count={heirs[h] ?? 0}
                    max={MAX[h] ?? 20}
                    onChange={(n) => setHeirs((x) => ({ ...x, [h]: n }))}
                  />
                ))}
              </div>
            )
            return g.more ? (
              <details key={g.title[0]} className="group">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t(...g.title)}</summary>
                {body}
              </details>
            ) : (
              <div key={g.title[0]}>
                <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{t(...g.title)}</p>
                {body}
              </div>
            )
          })}
          {anyone && (
            <button type="button" onClick={() => setHeirs({})} className="text-xs text-muted-foreground underline">
              {t('Kosongkan', 'Clear')}
            </button>
          )}
        </div>
      </div>

      {!anyone ? (
        <p className="text-sm text-muted-foreground">
          {t('Tambahkan ahli waris untuk melihat pembagiannya.', 'Add heirs to see how the estate is divided.')}
        </p>
      ) : (
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <ul className="divide-y text-sm tabular-nums sm:hidden">
            {r.shares.map((s) => (
              <li key={s.heir} className="flex justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p>
                    {nameOf(s.heir)}
                    {s.count > 1 && <span className="text-muted-foreground"> × {s.count}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.basis !== 'asabah' && <span className="font-mono">{basisText(s)} · </span>}
                    {t(...RULES[s.rule])}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[13px]">
                    {fracText(s.total)} <span className="text-xs text-muted-foreground">({pct(s.total)})</span>
                  </p>
                  {money.net > 0 && <p className="font-medium">{rp(amount(s.total))}</p>}
                  {money.net > 0 && s.count > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {rp(amount(s.each))} {t('/orang', 'each')}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {r.treasury.n > 0 && (
              <li className="flex justify-between gap-3 py-2.5">
                <span>{t('Baitul mal', 'Public treasury (baitul mal)')}</span>
                <span className="text-right font-mono text-[13px]">
                  {fracText(r.treasury)}
                  {money.net > 0 && <span className="block font-sans">{rp(amount(r.treasury))}</span>}
                </span>
              </li>
            )}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">{t('Ahli waris', 'Heir')}</th>
                  <th className="py-2 font-medium">{t('Bagian', 'Share')}</th>
                  <th className="py-2 text-right font-medium">{t('Akhir', 'Final')}</th>
                  {money.net > 0 && <th className="py-2 text-right font-medium">{t('Jumlah', 'Amount')}</th>}
                  {money.net > 0 && <th className="py-2 text-right font-medium">{t('Per orang', 'Each')}</th>}
                </tr>
              </thead>
              <tbody>
                {r.shares.map((s) => (
                  <tr key={s.heir} className="border-t align-top">
                    <td className="py-2 pr-3">
                      {nameOf(s.heir)}
                      {s.count > 1 && <span className="text-muted-foreground"> × {s.count}</span>}
                      <span className="block text-xs text-muted-foreground">{t(...RULES[s.rule])}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[13px]">{basisText(s)}</td>
                    <td className="py-2 text-right">
                      <span className="font-mono text-[13px]">{fracText(s.total)}</span>
                      <span className="block text-xs text-muted-foreground">{pct(s.total)}</span>
                    </td>
                    {money.net > 0 && <td className="py-2 text-right">{rp(amount(s.total))}</td>}
                    {money.net > 0 && <td className="py-2 text-right">{s.count > 1 ? rp(amount(s.each)) : '—'}</td>}
                  </tr>
                ))}
                {r.treasury.n > 0 && (
                  <tr className="border-t">
                    <td className="py-2">{t('Baitul mal', 'Public treasury (baitul mal)')}</td>
                    <td className="py-2 font-mono text-[13px]">—</td>
                    <td className="py-2 text-right font-mono text-[13px]">{fracText(r.treasury)}</td>
                    {money.net > 0 && <td className="py-2 text-right">{rp(amount(r.treasury))}</td>}
                    {money.net > 0 && <td className="py-2 text-right">—</td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              {t(`Asal masalah ${r.base}`, `Base (asal masalah) ${r.base}`)}
              {r.baseEach !== r.base && t(`, ditashih jadi ${r.baseEach} supaya bagian per orang bulat.`, `, corrected to ${r.baseEach} so each person's share is whole.`)}
            </li>
            {r.aul && (
              <li>
                {t(
                  `'Aul: jumlah bagian tetap melebihi harta, jadi asal masalah dinaikkan dari ${r.aul.from} ke ${r.aul.to} dan semua bagian berkurang sebanding.`,
                  `'Aul: the fixed shares add up to more than the estate, so the base rises from ${r.aul.from} to ${r.aul.to} and every share shrinks in proportion.`,
                )}
              </li>
            )}
            {r.radd === 'heirs' && (
              <li>
                {t(
                  'Radd: tidak ada ashabah, jadi sisa harta dikembalikan ke ahli waris bagian tetap (selain suami/istri) sebanding bagiannya.',
                  'Radd: there is no residuary, so the rest goes back to the fixed-share heirs (except the spouse) in proportion.',
                )}
              </li>
            )}
            {r.radd === 'spouse' && (
              <li>
                {t(
                  'Hanya ada suami/istri, jadi sisanya diberikan kepadanya (praktik umum di Indonesia; pendapat klasik: ke baitul mal).',
                  'Only a spouse is left, so the rest goes to them (common practice in Indonesia; the classical view sends it to the public treasury).',
                )}
              </li>
            )}
            {r.blocked.map((b) => (
              <li key={b.heir}>
                {t(
                  `${nameOf(b.heir)} terhalang (mahjub) oleh ${b.by.map(nameOf).join(', ').toLowerCase()}.`,
                  `${nameOf(b.heir)}: excluded (mahjub) by ${b.by.map(nameOf).join(', ').toLowerCase()}.`,
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Perhitungan faraid menurut pendapat jumhur (mazhab Syafi‘i) yang umum diajarkan di Indonesia. Kakek dihitung menggantikan ayah dan menghalangi saudara; musytarakah mengikuti pendapat Umar/Syafi‘i. Ahli waris pengganti dalam KHI (mis. cucu dari anak perempuan) dan pembagian berdasarkan kesepakatan keluarga tidak dihitung. Ini alat bantu, bukan fatwa: untuk pembagian resmi, rujuk ke Pengadilan Agama atau ulama setempat.',
          'Faraid as computed by the majority (Shafi‘i) view taught in Indonesia. The grandfather stands in for the father and excludes siblings; musytarakah follows Umar/Shafi‘i. KHI substitute heirs (e.g. a daughter’s children) and family agreements are not included. This is an aid, not a fatwa: for an official division, consult a religious court or a local scholar.',
        )}
      </p>
    </div>
  )
}
