import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { buildPlates, dotColor, packDots, rng, score, type Plate } from './plate'

const SIZE = 340

function PlateCanvas({ plate }: { plate: Plate }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = SIZE * dpr
    cv.height = SIZE * dpr
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Digit mask, drawn off-screen and sampled at each dot's centre.
    const m = document.createElement('canvas')
    m.width = SIZE
    m.height = SIZE
    const mc = m.getContext('2d', { willReadFrequently: true })
    if (!mc) return
    mc.fillStyle = '#000'
    mc.textAlign = 'center'
    mc.textBaseline = 'middle'
    mc.font = `800 ${SIZE * 0.78}px Geist, system-ui, sans-serif`
    mc.fillText(String(plate.digit), SIZE / 2, SIZE / 2 + SIZE * 0.04)
    const mask = mc.getImageData(0, 0, SIZE, SIZE).data
    const R = SIZE / 2
    const dots = packDots(R, plate.seed)
    const rand = rng(plate.seed ^ 0x9e3779b9)
    ctx.clearRect(0, 0, SIZE, SIZE)
    for (const d of dots) {
      const px = Math.min(SIZE - 1, Math.max(0, Math.round(d.x)))
      const py = Math.min(SIZE - 1, Math.max(0, Math.round(d.y)))
      const inside = mask[(py * SIZE + px) * 4 + 3] > 128
      ctx.fillStyle = dotColor(plate.axis, inside, rand)
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [plate])
  return <canvas ref={ref} style={{ width: SIZE, height: SIZE, maxWidth: '100%', aspectRatio: '1' }} className="rounded-full bg-muted" role="img" aria-label="" />
}

export default function TesButaWarna() {
  const t = useT()
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const plates = useMemo(() => buildPlates(seed), [seed])
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const i = answers.length
  const done = started && i >= plates.length
  const verdict = done ? score(plates, answers) : null

  const restart = () => {
    setSeed(Math.floor(Math.random() * 1e9))
    setAnswers([])
    setStarted(false)
  }
  const label = (v: 'normal' | 'maybe' | 'unclear', what: [string, string]) =>
    v === 'normal'
      ? t(`${what[0]}: kamu melihat hampir semua angka — tidak ada tanda gangguan.`, `${what[1]}: you saw nearly every number — no sign of a deficiency.`)
      : v === 'maybe'
        ? t(`${what[0]}: banyak angka tidak terlihat — kemungkinan ada gangguan.`, `${what[1]}: many numbers were not visible — a deficiency is possible.`)
        : t(`${what[0]}: hasil di tengah, belum bisa disimpulkan. Ulangi di ruang terang.`, `${what[1]}: a middle result, inconclusive. Retry in good light.`)

  return (
    <div className="space-y-6">
      {!started ? (
        <div className="max-w-xl space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>{t('Ada 10 pelat titik-titik; tiap pelat berisi satu angka 2–9 yang tersamar.', '10 dot plates, each hiding one digit from 2 to 9.')}</li>
            <li>{t('Duduk di ruang terang, matikan mode malam / filter cahaya biru, dan atur kecerahan layar penuh.', 'Sit in good light, turn off night mode / blue-light filters, and set the screen to full brightness.')}</li>
            <li>{t('Pakai kacamata atau lensa kontakmu seperti biasa. Jangan menyipit; jawab dalam beberapa detik.', 'Wear your usual glasses or lenses. Do not squint; answer within a few seconds.')}</li>
            <li>{t('Bila tidak melihat angka apa pun, pilih "Tidak terlihat".', 'If you see no number, choose "Cannot see".')}</li>
          </ul>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-brand-ink"
          >
            {t('Mulai tes', 'Start test')}
          </button>
        </div>
      ) : !done ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground tabular-nums">{t(`Pelat ${i + 1} dari ${plates.length}`, `Plate ${i + 1} of ${plates.length}`)}</p>
          <PlateCanvas key={i} plate={plates[i]} />
          <p className="text-sm font-medium">{t('Angka berapa yang kamu lihat?', 'Which number do you see?')}</p>
          <div className="flex max-w-md flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAnswers([...answers, n])}
                className="size-11 rounded-xl border text-lg font-semibold hover:bg-muted"
              >
                {n}
              </button>
            ))}
            <button type="button" onClick={() => setAnswers([...answers, null])} className="rounded-xl border px-4 text-sm hover:bg-muted">
              {t('Tidak terlihat', 'Cannot see')}
            </button>
          </div>
        </div>
      ) : (
        verdict && (
          <div className="max-w-xl space-y-4">
            <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
              {!verdict.controlOk && (
                <p className="text-sm font-medium">
                  {t(
                    'Pelat kontrol (yang seharusnya mudah) salah dijawab, jadi hasil tes ini tidak bisa dipercaya. Cek kecerahan layar dan ulangi.',
                    'The control plate (meant to be easy) was missed, so this result is unreliable. Check screen brightness and retry.',
                  )}
                </p>
              )}
              <p className="text-sm">
                {label(verdict.rg, ['Merah-hijau', 'Red-green'])}{' '}
                <span className="tabular-nums text-muted-foreground">
                  ({verdict.rgScore}/{verdict.rgTotal})
                </span>
              </p>
              <p className="text-sm">
                {label(verdict.by, ['Biru-kuning', 'Blue-yellow'])}{' '}
                <span className="tabular-nums text-muted-foreground">
                  ({verdict.byScore}/{verdict.byTotal})
                </span>
              </p>
            </div>
            <ul className="grid grid-cols-5 gap-2 text-center text-xs">
              {plates.map((p, k) => (
                <li key={k} className={`rounded-lg border p-1.5 ${answers[k] === p.digit ? '' : 'border-destructive/60'}`}>
                  <span className="block text-muted-foreground">{p.axis === 'control' ? t('kontrol', 'control') : p.axis === 'rg' ? t('merah-hijau', 'red-green') : t('biru-kuning', 'blue-yellow')}</span>
                  <span className="tabular-nums">
                    {answers[k] ?? '–'} / <b>{p.digit}</b>
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-muted">
              <RotateCcw className="size-4" /> {t('Ulangi dengan pelat baru', 'Retry with new plates')}
            </button>
          </div>
        )
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Pelat dibuat sendiri secara acak di perangkatmu (bukan pelat Ishihara). Warna layar yang belum dikalibrasi, kecerahan, mode malam, dan cahaya ruangan memengaruhi hasil. Ini hanya skrining kasar dan bukan pengganti tes resmi oleh dokter mata atau optometris, misalnya untuk SIM, sekolah kedinasan, atau pekerjaan. Tidak ada data yang dikirim ke mana pun.',
          'Plates are generated randomly on your device (they are not Ishihara plates). An uncalibrated screen, brightness, night mode and room light all affect the result. This is a rough screening only and no substitute for an official test by an eye doctor or optometrist, e.g. for a driving licence, a service academy or a job. Nothing is sent anywhere.',
        )}
      </p>
    </div>
  )
}
