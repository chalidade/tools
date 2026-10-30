import { useEffect, useState } from 'react'
import { Download, ExternalLink, MapPin, ShieldCheck } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { canvasBlob, decodeImage, formatBytes, newCanvas } from '@/lib/image'
import { formatCoords, readExif, sniff, stripMetadata, textMap, type ExifInfo } from './exif'

interface Loaded {
  file: File
  bytes: Uint8Array
  info: ExifInfo
  preview: string
}

/** The clean file: lossless for JPG/PNG/WebP, a re-encode (which drops everything) for rotated JPGs. */
async function clean(loaded: Loaded): Promise<{ blob: Blob; name: string }> {
  const { file, bytes } = loaded
  const base = file.name.replace(/\.[^.]+$/, '')
  const kind = sniff(bytes)
  const stripped = stripMetadata(bytes)
  if (stripped && kind !== 'other') {
    return { blob: new Blob([stripped as BlobPart], { type: `image/${kind}` }), name: `${base}-${tr('bersih', 'clean')}.${kind === 'jpeg' ? 'jpg' : kind}` }
  }
  const img = await decodeImage(file)
  try {
    const canvas = newCanvas(img.width, img.height)
    canvas.getContext('2d')!.drawImage(img.source, 0, 0, canvas.width, canvas.height)
    const type = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    const blob = await canvasBlob(canvas, type, 0.95)
    return { blob, name: `${base}-${tr('bersih', 'clean')}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}` }
  } finally {
    img.close()
  }
}

export default function StripExif() {
  const t = useT()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState(false)
  const [cleaned, setCleaned] = useState<{ blob: Blob; name: string } | null>(null)

  useEffect(() => () => (loaded ? URL.revokeObjectURL(loaded.preview) : undefined), [loaded])

  async function open([file]: File[]) {
    setError(false)
    setCleaned(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const check = await decodeImage(file)
      check.close()
      setLoaded({ file, bytes, info: readExif(bytes), preview: URL.createObjectURL(file) })
    } catch {
      setLoaded(null)
      setError(true)
    }
  }

  async function strip() {
    if (!loaded) return
    try {
      const out = await clean(loaded)
      setCleaned(out)
      downloadBlob(out.blob, out.name)
    } catch {
      setError(true)
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-6">
        <FileDrop accept="image/jpeg,image/png,image/webp" label={t('Tarik foto ke sini', 'Drop a photo here')} onFiles={(f) => void open(f)} />
        {error && <ErrorNote message={t('Gambar ini tidak bisa dibaca.', "This image can't be read.")} />}
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'JPG, PNG, atau WebP. Foto dari HP biasanya membawa tanggal, tipe kamera, dan lokasi GPS.',
            'JPG, PNG or WebP. Phone photos usually carry the date, camera model and GPS location.',
          )}
        </p>
      </div>
    )
  }

  const { info, file } = loaded
  const nothing = !info.has.exif && !info.has.xmp && !info.has.iptc && !info.has.comment
  const present = [
    info.has.exif && 'EXIF',
    info.has.xmp && 'XMP',
    info.has.iptc && 'IPTC',
    info.has.comment && t('komentar/teks', 'comments/text'),
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row">
        <img src={loaded.preview} alt="" className="size-28 shrink-0 rounded-xl bg-muted object-cover" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
          <p className="text-sm">
            {nothing
              ? t('Tidak ada metadata yang ditemukan.', 'No metadata found.')
              : t(`Ditemukan: ${present.join(', ')}`, `Found: ${present.join(', ')}`)}
          </p>
          {info.gps && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <MapPin className="size-4" />
              {t('Foto ini menyimpan lokasi GPS.', 'This photo stores a GPS location.')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2 sm:flex-col">
          <Button onClick={() => void strip()}>
            <ShieldCheck />
            {t('Hapus metadata & unduh', 'Remove metadata & download')}
          </Button>
          <Button variant="ghost" onClick={() => setLoaded(null)}>
            {t('Ganti foto', 'Change photo')}
          </Button>
        </div>
      </div>

      {error && <ErrorNote message={t('Gagal menyimpan ulang gambar.', 'Could not save the image again.')} />}
      {cleaned && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-sm">
          <p>
            {t('Selesai: ', 'Done: ')}
            <span className="font-medium">{cleaned.name}</span> · {formatBytes(cleaned.blob.size)}
          </p>
          <Button variant="outline" size="sm" onClick={() => downloadBlob(cleaned.blob, cleaned.name)}>
            <Download />
            {t('Unduh lagi', 'Download again')}
          </Button>
        </div>
      )}

      {info.fields.length > 0 && (
        <dl className="divide-y overflow-hidden rounded-2xl border bg-card">
          {info.fields.map((f) => (
            <div key={f.label[1]} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{t(...f.label)}</dt>
              <dd className="text-right font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {info.gps && (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-sm font-semibold">{formatCoords(info.gps.lat, info.gps.lon)}</p>
            <div className="flex gap-2">
              <CopyButton text={`${info.gps.lat.toFixed(6)}, ${info.gps.lon.toFixed(6)}`} />
              <a
                href={`https://www.openstreetmap.org/?mlat=${info.gps.lat}&mlon=${info.gps.lon}#map=15/${info.gps.lat}/${info.gps.lon}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ExternalLink />
                {t('Buka di peta', 'Open in map')}
              </a>
            </div>
          </div>
          <pre aria-label={tr('Peta teks', 'Text map')} className="overflow-x-auto rounded-xl bg-muted/60 p-3 text-center font-mono text-xs leading-tight text-muted-foreground">
            {textMap(info.gps.lat, info.gps.lon)}
          </pre>
          <p className="text-xs text-muted-foreground">
            {t(
              'Peta teks: ◉ menandai posisi di peta dunia kasar. “Buka di peta” membuka OpenStreetMap di tab baru — hanya jika kamu klik.',
              'Text map: ◉ marks the position on a rough world grid. “Open in map” opens OpenStreetMap in a new tab — only if you click it.',
            )}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'JPG, PNG, dan WebP dibersihkan tanpa mengubah gambarnya sama sekali. Foto yang disimpan miring lewat tanda orientasi disimpan ulang (kualitas 95).',
          'JPG, PNG and WebP are cleaned without touching the picture at all. Photos stored sideways via an orientation flag are re-saved (quality 95).',
        )}
      </p>
    </div>
  )
}
