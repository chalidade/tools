import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { useLang, useT } from '@/lib/i18n'
import { downloadBlob } from '@/lib/download'
import { BLOOD_TYPES, EMPTY_CARD, SIZES, drawWallpaper, wallpaperBlob, type Labels, type MedicalCard } from './wallpaper'

const KEY = 'tools:kartu-medis'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

function load(): MedicalCard {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object') return { ...EMPTY_CARD, ...s }
  } catch {
    /* storage blocked or empty */
  }
  return EMPTY_CARD
}

export default function KartuMedis() {
  const t = useT()
  useLang()
  const [card, setCard] = useState(load)
  const [rh, setRh] = useState<'+' | '-' | ''>('')
  const [abo, setAbo] = useState('')
  const [sizeId, setSizeId] = useState(SIZES[0].id)
  const preview = useRef<HTMLCanvasElement>(null)
  const size = SIZES.find((s) => s.id === sizeId)!

  // The blood type is edited as two pieces but stored as one string.
  useEffect(() => {
    const m = /^(AB|A|B|O)\s*([+-])?$/i.exec(card.blood.trim())
    if (m) {
      setAbo(m[1].toUpperCase())
      setRh((m[2] as '+' | '-') ?? '')
    }
    // only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(card))
    } catch {
      /* storage blocked */
    }
  }, [card])

  const labels: Labels = {
    title: t('KARTU MEDIS DARURAT', 'EMERGENCY MEDICAL CARD'),
    blood: t('Golongan darah', 'Blood type'),
    allergies: t('Alergi', 'Allergies'),
    medications: t('Obat rutin', 'Regular medication'),
    conditions: t('Kondisi medis', 'Medical conditions'),
    contact: t('Hubungi', 'Call'),
    note: t('Catatan', 'Note'),
  }
  const labelsKey = JSON.stringify(labels)
  const set = <K extends keyof MedicalCard>(k: K, v: MedicalCard[K]) => setCard((p) => ({ ...p, [k]: v }))
  const setBlood = (a: string, r: string) => {
    setAbo(a)
    setRh(r as '+' | '-' | '')
    set('blood', a ? `${a}${r}` : '')
  }
  const empty = useMemo(() => Object.values(card).every((v) => !v.trim()), [card])

  useEffect(() => {
    const out = preview.current
    if (!out) return
    const full = drawWallpaper(card, size, labels)
    out.width = 270
    out.height = Math.round((270 * size.h) / size.w)
    out.getContext('2d')!.drawImage(full, 0, 0, out.width, out.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, size, labelsKey])

  async function save() {
    downloadBlob(await wallpaperBlob(card, size, labels), 'kartu-medis.png')
  }

  const field = (k: keyof MedicalCard, label: string, multiline = false, type = 'text') => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea className={inputCls} rows={2} value={card[k]} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <input className={inputCls} type={type} value={card[k]} onChange={(e) => set(k, e.target.value)} />
      )}
    </label>
  )

  return (
    <div className="space-y-6">
      <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        {t(
          'Data hanya disimpan di perangkat ini dan tidak dikirim ke mana pun. Simpan sebagai gambar lalu jadikan wallpaper layar kunci, supaya penolong bisa membacanya tanpa membuka kunci HP.',
          'Data is kept on this device only and never sent anywhere. Save it as an image and set it as your lock screen wallpaper so a first responder can read it without unlocking your phone.',
        )}
      </p>
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          {field('name', t('Nama', 'Name'))}
          <div className="space-y-2">
            <Segmented label={t('Golongan darah', 'Blood type')} value={abo} onChange={(v) => setBlood(v, rh)} options={[{ value: '', label: '—' }, ...BLOOD_TYPES.map((b) => ({ value: b, label: b }))]} />
            <Segmented label={t('Rhesus', 'Rhesus')} value={rh} onChange={(v) => setBlood(abo, v)} options={[{ value: '', label: '—' }, { value: '+', label: '+' }, { value: '-', label: '−' }]} />
          </div>
          {field('allergies', t('Alergi (obat, makanan)', 'Allergies (drugs, food)'), true)}
          {field('medications', t('Obat rutin', 'Regular medication'), true)}
          {field('conditions', t('Kondisi medis (diabetes, asma, alat pacu jantung…)', 'Medical conditions (diabetes, asthma, pacemaker…)'), true)}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('contactName', t('Kontak darurat (nama & hubungan)', 'Emergency contact (name & relation)'))}
            {field('contactPhone', t('Nomor telepon kontak', 'Contact phone'), false, 'tel')}
          </div>
          {field('note', t('Catatan lain', 'Other notes'), true)}
          <Button variant="outline" size="sm" onClick={() => { setCard(EMPTY_CARD); setAbo(''); setRh('') }} disabled={empty}>
            <Trash2 className="size-4" /> {t('Hapus data', 'Clear data')}
          </Button>
        </div>
        <div className="space-y-3">
          <Segmented label={t('Ukuran layar', 'Screen size')} value={sizeId} onChange={setSizeId} options={SIZES.map((s) => ({ value: s.id, label: t(s.label[0], s.label[1]) }))} />
          <canvas ref={preview} className="w-[270px] max-w-full rounded-2xl border" aria-label={t('Pratinjau wallpaper', 'Wallpaper preview')} />
          <p className="max-w-[270px] text-xs text-muted-foreground">
            {t('Kartu diletakkan di bawah area jam dan notifikasi layar kunci.', 'The card sits below the lock screen clock and notifications.')}
          </p>
          <Button onClick={save} disabled={empty}>
            <Download className="size-4" /> {t('Simpan wallpaper (PNG)', 'Save wallpaper (PNG)')}
          </Button>
        </div>
      </div>
    </div>
  )
}
