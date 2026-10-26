import { useEffect, useRef, useState } from 'react'
import { Compass } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { DEFAULT_SPOT, LocationPicker, type Spot } from '../jadwal-sholat/Location'
import { qibla } from '../jadwal-sholat/prayer'

interface IOSOrientation {
  requestPermission?: () => Promise<'granted' | 'denied'>
}
type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number }

const norm = (a: number) => ((a % 360) + 360) % 360

export default function ArahKiblat() {
  const t = useT()
  const [spot, setSpot] = useState<Spot>(DEFAULT_SPOT)
  const [heading, setHeading] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [live, setLive] = useState(false)
  const [error, setError] = useState('')
  const stop = useRef<(() => void) | null>(null)

  const { bearing, km } = qibla(spot.lat, spot.lng)
  useEffect(() => () => stop.current?.(), [])

  const start = async () => {
    setError('')
    const Ctor = window.DeviceOrientationEvent as unknown as IOSOrientation | undefined
    if (!Ctor) {
      setError(t('Perangkat ini tidak punya sensor arah. Pakai sudut di atas dengan kompas lain.', 'This device has no orientation sensor. Use the bearing above with another compass.'))
      return
    }
    if (typeof Ctor.requestPermission === 'function') {
      try {
        if ((await Ctor.requestPermission()) !== 'granted') {
          setError(t('Izin sensor ditolak. Izinkan "Gerak & Orientasi" di pengaturan Safari.', 'Sensor permission denied. Allow "Motion & Orientation" in Safari settings.'))
          return
        }
      } catch {
        setError(t('Izin sensor tidak bisa diminta.', 'Could not ask for sensor permission.'))
        return
      }
    }
    stop.current?.()
    const onEvent = (e: Event) => {
      const o = e as OrientationEvt
      if (typeof o.webkitCompassHeading === 'number') {
        setHeading(norm(o.webkitCompassHeading))
        setAccuracy(o.webkitCompassAccuracy ?? null)
      } else if (o.alpha !== null && (o.absolute || e.type === 'deviceorientationabsolute')) {
        setHeading(norm(360 - o.alpha))
        setAccuracy(null)
      }
    }
    window.addEventListener('deviceorientationabsolute', onEvent, true)
    window.addEventListener('deviceorientation', onEvent, true)
    stop.current = () => {
      window.removeEventListener('deviceorientationabsolute', onEvent, true)
      window.removeEventListener('deviceorientation', onEvent, true)
    }
    setLive(true)
    setTimeout(() => setHeading((h) => { if (h === null) setError(t('Tidak ada data kompas dari perangkat. Coba di HP, bukan komputer.', 'No compass data from the device. Try on a phone, not a computer.')); return h }), 3000)
  }

  const poorAccuracy = accuracy !== null && (accuracy < 0 || accuracy > 25)
  const turn = heading === null ? null : norm(bearing - heading)
  const aligned = turn !== null && (turn < 4 || turn > 356)
  // The dial rotates opposite to the phone so N stays on the real north.
  const dialRot = heading === null ? 0 : -heading

  return (
    <div className="space-y-6">
      <LocationPicker spot={spot} onChange={setSpot} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">{t('Arah kiblat dari utara sejati', 'Qibla from true north')}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{bearing.toFixed(1)}°</p>
        </div>
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">{t('Jarak ke Ka’bah', 'Distance to the Kaaba')}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{Math.round(km).toLocaleString()} km</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className={`relative size-64 rounded-full border-4 transition-colors ${aligned ? 'border-primary' : 'border-border'}`}
          role="img"
          aria-label={t('Kompas kiblat', 'Qibla compass')}
        >
          <div className="absolute inset-0 transition-transform duration-200" style={{ transform: `rotate(${dialRot}deg)` }}>
            {['N', 'E', 'S', 'W'].map((l, i) => (
              <div key={l} className="absolute inset-0" style={{ transform: `rotate(${i * 90}deg)` }}>
                <span className={`absolute left-1/2 top-1 -translate-x-1/2 text-sm font-semibold ${l === 'N' ? 'text-destructive' : 'text-muted-foreground'}`}>{l}</span>
              </div>
            ))}
            <div className="absolute inset-0" style={{ transform: `rotate(${bearing}deg)` }}>
              <div className="absolute left-1/2 top-3 h-1/2 w-1 -translate-x-1/2 origin-bottom rounded-full bg-primary" style={{ height: 'calc(50% - 12px)' }} />
              <div className="absolute left-1/2 top-2 size-4 -translate-x-1/2 rounded-full bg-primary" />
            </div>
          </div>
          <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
          {/* fixed marker: the direction the top of the phone points */}
          <div className="absolute -top-3 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-b-0 border-t-[12px] border-x-transparent border-t-foreground" />
        </div>

        {turn !== null && (
          <p className="text-center text-sm">
            {aligned
              ? t('Sudah menghadap kiblat.', 'You are facing the Qibla.')
              : turn <= 180
                ? t(`Putar ${Math.round(turn)}° ke kanan.`, `Turn ${Math.round(turn)}° right.`)
                : t(`Putar ${Math.round(360 - turn)}° ke kiri.`, `Turn ${Math.round(360 - turn)}° left.`)}
          </p>
        )}

        {!live && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Compass className="size-4" />
            {t('Aktifkan kompas HP', 'Turn on phone compass')}
          </button>
        )}
      </div>

      {poorAccuracy && (
        <ErrorNote message={t('Sensor kompas kurang akurat. Kalibrasi dengan menggerakkan HP membentuk angka 8, dan jauhkan dari logam, magnet, dan casing magnetik.', 'The compass sensor is not accurate. Calibrate by moving the phone in a figure-8, and keep it away from metal, magnets and magnetic cases.')} />
      )}
      {error && <ErrorNote message={error} />}

      <p className="text-xs text-muted-foreground">
        {t(
          'Sudut dihitung di perangkat dengan rumus lingkaran besar ke Ka’bah (21,4225°N, 39,8262°E) dan dihitung dari utara sejati, bukan utara magnet. Kompas HP menunjuk utara magnet bila perangkat tidak mengoreksinya, jadi bisa meleset beberapa derajat; cocokkan dengan arah saf masjid atau penanda kiblat setempat. Sensor kompas hanya bekerja di HP atau tablet, dan hanya lewat HTTPS.',
          'The bearing is computed on your device with the great-circle formula to the Kaaba (21.4225°N, 39.8262°E) and measured from true north, not magnetic north. A phone compass may point to magnetic north if the device does not correct it, so it can be off by a few degrees; check against the mosque’s rows or a local Qibla marker. The compass sensor works only on phones and tablets, and only over HTTPS.',
        )}
      </p>
    </div>
  )
}
