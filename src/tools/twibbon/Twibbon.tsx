import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, ImagePlus, RotateCcw, RotateCw, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { canvasBlob, decodeImage, newCanvas, UnreadableImageError, type DecodedImage } from '@/lib/image'
import { downloadBlob } from '@/lib/download'
import { useLang, useT } from '@/lib/i18n'
import { useRoute } from '@/lib/route'
import { findHole } from './hole'
import { defaultText, drawTemplate, SIZE, TEMPLATE_HOLE, TEMPLATES, type Hole, type TemplateId, type TemplateText } from './templates'

type Source = 'own' | TemplateId

interface Frame {
  source: CanvasImageSource
  width: number
  height: number
  /** The transparent window the photo shows through; null when there is none. */
  hole: Hole | null
}

/** Where the photo sits: its centre in frame pixels, frame pixels per photo pixel, and turn in degrees. */
interface Place {
  x: number
  y: number
  scale: number
  rot: number
}

const PREVIEW_MAX = 1080

/** The photo just covering the hole (or the whole frame), centred on it. */
function fit(photo: DecodedImage, frame: Frame): Place {
  const r = frame.hole ?? { x: 0, y: 0, w: frame.width, h: frame.height }
  return { x: r.x + r.w / 2, y: r.y + r.h / 2, scale: Math.max(r.w / photo.width, r.h / photo.height), rot: 0 }
}

function compose(canvas: HTMLCanvasElement, frame: Frame, photo: DecodedImage | null, place: Place | null, k: number, jpg = false) {
  canvas.width = Math.round(frame.width * k)
  canvas.height = Math.round(frame.height * k)
  const c = canvas.getContext('2d')!
  c.setTransform(k, 0, 0, k, 0, 0)
  c.fillStyle = photo || jpg ? '#ffffff' : '#d4d4d8'
  c.fillRect(0, 0, frame.width, frame.height)
  if (photo && place) {
    c.save()
    c.translate(place.x, place.y)
    c.rotate((place.rot * Math.PI) / 180)
    c.scale(place.scale, place.scale)
    c.imageSmoothingQuality = 'high'
    c.drawImage(photo.source, -photo.width / 2, -photo.height / 2)
    c.restore()
  }
  c.drawImage(frame.source, 0, 0, frame.width, frame.height)
}

const sourceOf = (slug: string): Source => TEMPLATES.find((x) => x.slug === slug)?.id ?? 'own'

export default function Twibbon() {
  const t = useT()
  const lang = useLang()
  const route = useRoute()
  const [source, setSource] = useState<Source>(() => sourceOf(route.slug))
  const [own, setOwn] = useState<(Frame & { img: DecodedImage }) | null>(null)
  const [texts, setTexts] = useState<Partial<Record<TemplateId, TemplateText>>>({})
  const [photo, setPhoto] = useState<DecodedImage | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [place, setPlace] = useState<Place | null>(null)
  const [base, setBase] = useState(1)
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [fonts, setFonts] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canShare, setCanShare] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  // Event pages (/twibbon-ramadan/ …) open with their template.
  useEffect(() => setSource(sourceOf(route.slug)), [route.slug])

  // Template texts follow the language until the visitor edits them.
  useEffect(() => setTexts({}), [lang])

  // Draw the template texts in Geist once it has loaded.
  useEffect(() => {
    let live = true
    Promise.all([document.fonts.load(`700 70px Geist`), document.fonts.load(`500 34px Geist`)])
      .catch(() => {})
      .then(() => live && setFonts((n) => n + 1))
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    try {
      const probe = new File([new Uint8Array(1)], 'twibbon.png', { type: 'image/png' })
      setCanShare(typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [probe] }))
    } catch {
      setCanShare(false)
    }
  }, [])

  const ownRef = useRef(own)
  ownRef.current = own
  const photoRef = useRef(photo)
  photoRef.current = photo
  useEffect(
    () => () => {
      ownRef.current?.img.close()
      photoRef.current?.close()
    },
    [],
  )

  const text = source === 'own' ? null : (texts[source] ?? defaultText(source))

  const frame: Frame | null = useMemo(() => {
    if (source === 'own') return own
    void fonts
    return { source: drawTemplate(source, text!), width: SIZE, height: SIZE, hole: TEMPLATE_HOLE }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, own, text?.top, text?.title, text?.subtitle, text?.name, fonts])

  // A new photo or another frame: start from the photo filling the hole.
  const frameKey = source === 'own' ? own : source
  useEffect(() => {
    if (photo && frame) {
      const p = fit(photo, frame)
      setPlace(p)
      setBase(p.scale)
    } else setPlace(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, frameKey])

  useEffect(() => {
    if (!canvasRef.current || !frame) return
    const k = Math.min(1, PREVIEW_MAX / Math.max(frame.width, frame.height))
    const id = requestAnimationFrame(() => canvasRef.current && compose(canvasRef.current, frame, photo, place, k))
    return () => cancelAnimationFrame(id)
  }, [frame, photo, place])

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!photoRef.current) return
      e.preventDefault()
      setPlace((p) => p && { ...p, scale: p.scale * Math.exp(-e.deltaY * 0.0015) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [frame])

  async function openFrame(files: File[]) {
    setError(null)
    setBusy(t('Membuka bingkai…', 'Opening frame…'))
    try {
      const img = await decodeImage(files[0])
      const hole = findHole(img.source, img.width, img.height)
      own?.img.close()
      setOwn({ img, source: img.source, width: img.width, height: img.height, hole })
      if (!hole)
        setError(
          t(
            'Bingkai ini tidak punya bagian transparan, jadi fotomu akan tertutup. Pakai file PNG dengan lubang transparan dari pembuat acaranya.',
            'This frame has no transparent part, so your photo will be hidden. Use the PNG with a transparent window from the event organiser.',
          ),
        )
    } catch (e) {
      if (!(e instanceof UnreadableImageError)) throw e
      setError(t('File ini bukan gambar yang bisa dibaca. Pakai PNG.', 'This file is not a readable image. Use a PNG.'))
    } finally {
      setBusy(null)
    }
  }

  async function openPhoto(files: File[]) {
    setError(null)
    setBusy(t('Membuka foto…', 'Opening photo…'))
    try {
      const img = await decodeImage(files[0])
      photo?.close()
      setPhoto(img)
      setPhotoName(files[0].name)
    } catch (e) {
      if (!(e instanceof UnreadableImageError)) throw e
      setError(t('File ini bukan gambar yang bisa dibaca (JPG, PNG, WebP, HEIC di iPhone).', 'This file is not a readable image (JPG, PNG, WebP, HEIC on iPhone).'))
    } finally {
      setBusy(null)
    }
  }

  function removePhoto() {
    photo?.close()
    setPhoto(null)
  }

  // Drag with one finger or the mouse; pinch to zoom and turn with two fingers.
  function toFrame(dx: number) {
    const el = canvasRef.current!
    return (dx * frame!.width) / el.getBoundingClientRect().width
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!photo) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const map = pointers.current
    const prev = map.get(e.pointerId)
    if (!prev || !place) return
    const before = [...map.values()]
    map.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const after = [...map.values()]
    if (after.length === 1) {
      setPlace({ ...place, x: place.x + toFrame(e.clientX - prev.x), y: place.y + toFrame(e.clientY - prev.y) })
    } else if (after.length >= 2) {
      const [a0, b0] = before
      const [a1, b1] = after
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1
      const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y) || 1
      const turn = (Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x)) * (180 / Math.PI)
      const mx = (a1.x + b1.x - a0.x - b0.x) / 2
      const my = (a1.y + b1.y - a0.y - b0.y) / 2
      setPlace({ x: place.x + toFrame(mx), y: place.y + toFrame(my), scale: place.scale * (d1 / d0), rot: place.rot + turn })
    }
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId)
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!place || !frame) return
    const step = frame.width / 100
    const moves: Record<string, Partial<Place>> = {
      ArrowLeft: { x: place.x - step },
      ArrowRight: { x: place.x + step },
      ArrowUp: { y: place.y - step },
      ArrowDown: { y: place.y + step },
      '+': { scale: place.scale * 1.05 },
      '=': { scale: place.scale * 1.05 },
      '-': { scale: place.scale / 1.05 },
    }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    setPlace({ ...place, ...m })
  }

  async function render() {
    if (!frame || !photo || !place) return null
    const canvas = newCanvas(1, 1)
    compose(canvas, frame, photo, place, 1, format === 'jpg')
    const blob = await canvasBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
    const name = `twibbon${source === 'own' ? '' : `-${source}`}.${format}`
    return { blob, name }
  }

  async function save() {
    const out = await render()
    if (out) downloadBlob(out.blob, out.name)
  }

  async function share() {
    const out = await render()
    if (!out) return
    const file = new File([out.blob], out.name, { type: out.blob.type })
    try {
      await navigator.share({ files: [file] })
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') downloadBlob(out.blob, out.name)
    }
  }

  function setText(key: keyof TemplateText, value: string) {
    if (source === 'own') return
    setTexts((all) => ({ ...all, [source]: { ...(all[source] ?? defaultText(source)), [key]: value } }))
  }

  const sources: { value: Source; label: string }[] = [
    { value: 'own', label: t('Bingkai sendiri', 'Your own frame') },
    ...TEMPLATES.map((x) => ({ value: x.id as Source, label: t(...x.label) })),
  ]
  const zoom = place ? place.scale / base : 1
  const fields: { key: keyof TemplateText; label: string }[] = [
    { key: 'top', label: t('Teks atas', 'Top text') },
    { key: 'title', label: t('Judul', 'Title') },
    { key: 'subtitle', label: t('Subjudul', 'Subtitle') },
    { key: 'name', label: t('Nama (kosongkan bila tak perlu)', 'Name (leave empty to hide)') },
  ]

  return (
    <div className="space-y-6">
      <Segmented label={t('Bingkai', 'Frame')} value={source} options={sources} onChange={setSource} />

      {source === 'own' && !own && (
        <FileDrop
          accept="image/png,image/webp,image/svg+xml"
          label={t('Tarik bingkai twibbon (PNG transparan) ke sini', 'Drop the twibbon frame (transparent PNG) here')}
          busyLabel={busy ?? undefined}
          onFiles={(f) => void openFrame(f)}
        />
      )}
      {source === 'own' && !own && (
        <p className="text-xs text-muted-foreground">
          {t(
            'Unduh file PNG bingkai dari panitia atau pembuat acaranya, lalu buka di sini. Belum punya bingkai? Pilih salah satu template di atas.',
            'Download the frame PNG from the event organiser and open it here. No frame yet? Pick one of the templates above.',
          )}
        </p>
      )}
      {error && <ErrorNote message={error} />}

      {frame && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-2">
            <div className="flex justify-center rounded-2xl border bg-muted/40 p-3">
              <canvas
                ref={canvasRef}
                tabIndex={photo ? 0 : -1}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
                className={`aspect-auto max-h-[70vh] w-auto max-w-full touch-none rounded-lg shadow outline-none focus-visible:ring-2 focus-visible:ring-ring ${photo ? 'cursor-grab active:cursor-grabbing' : ''}`}
                aria-label={t('Pratinjau twibbon. Geser untuk memindah foto, cubit untuk memperbesar.', 'Twibbon preview. Drag to move the photo, pinch to zoom.')}
              />
            </div>
            {photo && (
              <p className="text-center text-xs text-muted-foreground">
                {t('Geser foto untuk memindah · cubit atau scroll untuk zoom · dua jari untuk memutar', 'Drag to move · pinch or scroll to zoom · two fingers to turn')}
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-4">
            {!photo ? (
              <FileDrop
                accept="image/*"
                label={t('Pilih fotomu', 'Pick your photo')}
                busyLabel={busy ?? undefined}
                onFiles={(f) => void openPhoto(f)}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <ImagePlus className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{photoName}</span>
                <button type="button" onClick={removePhoto} aria-label={t('Ganti foto', 'Change photo')} className="rounded p-1 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
            )}

            {photo && place && (
              <>
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  {t('Perbesar', 'Zoom')}: {Math.round(zoom * 100)}%
                  <input type="range" min={0.3} max={4} step={0.01} value={zoom} onChange={(e) => setPlace({ ...place, scale: base * +e.target.value })} className="w-full" />
                </label>
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  {t('Putar', 'Rotate')}: {Math.round(place.rot)}°
                  <input type="range" min={-180} max={180} step={1} value={((place.rot + 540) % 360) - 180} onChange={(e) => setPlace({ ...place, rot: +e.target.value })} className="w-full" />
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPlace({ ...place, rot: place.rot - 90 })} aria-label={t('Putar kiri 90°', 'Turn left 90°')}>
                    <RotateCcw />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPlace({ ...place, rot: place.rot + 90 })} aria-label={t('Putar kanan 90°', 'Turn right 90°')}>
                    <RotateCw />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => frame && setPlace(fit(photo, frame))}>
                    {t('Pas-kan lagi', 'Fit again')}
                  </Button>
                </div>
              </>
            )}

            {text && (
              <div className="space-y-2 border-t pt-4">
                {fields.map((f) => (
                  <label key={f.key} className="block space-y-1 text-xs font-medium text-muted-foreground">
                    {f.label}
                    <input value={text[f.key]} maxLength={60} onChange={(e) => setText(f.key, e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" />
                  </label>
                ))}
              </div>
            )}

            {source === 'own' && own && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => { own.img.close(); setOwn(null); setError(null) }}>
                {t('Ganti bingkai', 'Change frame')}
              </Button>
            )}

            {photo && (
              <div className="space-y-3 border-t pt-4">
                <Segmented label={t('Format', 'Format')} value={format} options={[{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }]} onChange={setFormat} />
                <Button className="w-full" onClick={() => void save()}>
                  <Download />
                  {t('Unduh twibbon', 'Download twibbon')}
                </Button>
                {canShare && (
                  <Button variant="outline" className="w-full" onClick={() => void share()}>
                    <Share2 />
                    {t('Bagikan', 'Share')}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  {t(`Ukuran asli bingkai: ${frame.width}×${frame.height} px.`, `Full frame size: ${frame.width}×${frame.height} px.`)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
