import { useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { ErrorNote } from '@/components/tool/ErrorNote'
import type { Place } from './prayer'
import cityData from './cities.json'

export interface Spot extends Place {
  name: string
}

const CITIES: Spot[] = (cityData as [string, number, number, number][]).map(([name, lat, lng, tz]) => ({ name, lat, lng, tz }))

const selectCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** City list or GPS; the position never leaves the device. */
export function LocationPicker({ spot, onChange }: { spot: Spot; onChange: (s: Spot) => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const locate = () => {
    if (!navigator.geolocation) {
      setError(t('Perangkat ini tidak mendukung lokasi.', 'This device does not support geolocation.'))
      return
    }
    setBusy(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        const tz = -new Date().getTimezoneOffset() / 60
        onChange({ name: t('Lokasi saya', 'My location'), lat: pos.coords.latitude, lng: pos.coords.longitude, tz })
      },
      () => {
        setBusy(false)
        setError(t('Lokasi tidak bisa dibaca. Izinkan akses lokasi, atau pilih kota dari daftar.', 'Could not read your location. Allow location access, or pick a city from the list.'))
      },
      { enableHighAccuracy: false, timeout: 15000 },
    )
  }

  const inList = CITIES.some((c) => c.name === spot.name)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 space-y-1 text-xs font-medium text-muted-foreground">
          {t('Kota', 'City')}
          <select
            className={selectCls}
            value={inList ? spot.name : ''}
            onChange={(e) => {
              const c = CITIES.find((x) => x.name === e.target.value)
              if (c) onChange(c)
            }}
          >
            {!inList && <option value="">{spot.name}</option>}
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={locate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <LocateFixed className="size-4" />
          {busy ? t('Mencari lokasi…', 'Locating…') : t('Pakai lokasi saya', 'Use my location')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {spot.lat.toFixed(4)}°, {spot.lng.toFixed(4)}° · UTC{spot.tz >= 0 ? '+' : ''}
        {spot.tz}
      </p>
      {error && <ErrorNote message={error} />}
    </div>
  )
}

export const DEFAULT_SPOT: Spot = CITIES.find((c) => c.name === 'Jakarta')!
