import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Download, ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { canvasBlob, decodeImage, newCanvas } from '@/lib/image'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  buildContact,
  buildEmail,
  buildPhone,
  buildWhatsApp,
  buildWifi,
  normalizeUrl,
  type ContactFields,
  type MessageFields,
  type QrKind,
  type WifiFields,
} from './payload'
import { qrMatrix, toCanvas, toSvg, type ErrorLevel, type ModuleStyle, type QrMatrix, type RenderOptions } from './render'
import { scanPixels } from './scan'

// Labels are [Indonesian, English]; the component picks one with t(...label).
type Label = readonly [string, string]

const KINDS: { value: QrKind; label: Label }[] = [
  { value: 'url', label: ['Tautan', 'Link'] },
  { value: 'text', label: ['Teks', 'Text'] },
  { value: 'wifi', label: ['Wi-Fi', 'Wi-Fi'] },
  { value: 'whatsapp', label: ['WhatsApp', 'WhatsApp'] },
  { value: 'contact', label: ['Kontak', 'Contact'] },
  { value: 'email', label: ['Email', 'Email'] },
  { value: 'phone', label: ['Telepon', 'Phone'] },
]
const LEVEL_OPTIONS: { value: ErrorLevel; label: string }[] = [
  { value: 'L', label: 'L 7%' },
  { value: 'M', label: 'M 15%' },
  { value: 'Q', label: 'Q 25%' },
  { value: 'H', label: 'H 30%' },
]
const STYLE_OPTIONS: { value: ModuleStyle; label: Label }[] = [
  { value: 'square', label: ['Kotak', 'Square'] },
  { value: 'rounded', label: ['Membulat', 'Rounded'] },
  { value: 'dots', label: ['Titik', 'Dots'] },
]
const MARGIN_OPTIONS: { value: number; label: Label }[] = [
  { value: 1, label: ['Tipis', 'Thin'] },
  { value: 2, label: ['Sedang', 'Medium'] },
  { value: 4, label: ['Standar', 'Standard'] },
]
const SIZE_OPTIONS: { value: number; label: string }[] = [
  { value: 512, label: '512 px' },
  { value: 1024, label: '1024 px' },
  { value: 2048, label: '2048 px' },
]

/** Relative luminance (WCAG), for warning about hard-to-scan colours. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export default function QrGenerator() {
  const t = useT()
  const [kind, setKind] = useState<QrKind>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [wifi, setWifi] = useState<WifiFields>({ ssid: '', password: '', security: 'WPA', hidden: false })
  const [wa, setWa] = useState<MessageFields>({ to: '', subject: '', body: '' })
  const [contact, setContact] = useState<ContactFields>({ name: '', phone: '', email: '', org: '', url: '' })
  const [email, setEmail] = useState<MessageFields>({ to: '', subject: '', body: '' })
  const [phone, setPhone] = useState('')

  const [level, setLevel] = useState<ErrorLevel>('M')
  const [style, setStyle] = useState<ModuleStyle>('square')
  const [fg, setFg] = useState('#111111')
  const [bg, setBg] = useState('#ffffff')
  const [transparent, setTransparent] = useState(false)
  const [margin, setMargin] = useState(2)
  const [logo, setLogo] = useState<string | null>(null)
  const [size, setSize] = useState(1024)

  const [matrix, setMatrix] = useState<QrMatrix | null>(null)
  const [tooLong, setTooLong] = useState(false)
  const [readable, setReadable] = useState<'checking' | 'ok' | 'fail' | null>(null)

  const payload = useMemo(() => {
    switch (kind) {
      case 'url':
        return normalizeUrl(url)
      case 'text':
        return text
      case 'wifi':
        return wifi.ssid ? buildWifi(wifi) : ''
      case 'whatsapp':
        return wa.to.replace(/\D/g, '').length >= 6 ? buildWhatsApp(wa) : ''
      case 'contact':
        return contact.name.trim() ? buildContact(contact) : ''
      case 'email':
        return email.to.includes('@') ? buildEmail(email) : ''
      case 'phone':
        return phone.replace(/\D/g, '').length >= 6 ? buildPhone(phone) : ''
    }
  }, [kind, url, text, wifi, wa, contact, email, phone])

  // A logo hides part of the code; only the highest recovery level reads through it reliably.
  const effectiveLevel: ErrorLevel = logo ? 'H' : level

  useEffect(() => {
    if (!payload) {
      setMatrix(null)
      setTooLong(false)
      return
    }
    let current = true
    qrMatrix(payload, effectiveLevel)
      .then((m) => current && (setMatrix(m), setTooLong(false)))
      .catch(() => current && (setMatrix(null), setTooLong(true)))
    return () => {
      current = false
    }
  }, [payload, effectiveLevel])

  const opts: RenderOptions = useMemo(
    () => ({ fg, bg: transparent ? null : bg, margin, style, logo }),
    [fg, bg, transparent, margin, style, logo],
  )
  const svg = useMemo(() => (matrix ? toSvg(matrix, opts) : null), [matrix, opts])

  // Check the result really scans: render it small and read it back.
  useEffect(() => {
    if (!matrix) {
      setReadable(null)
      return
    }
    let current = true
    setReadable('checking')
    const timer = setTimeout(async () => {
      const canvas = await toCanvas(matrix, { ...opts, bg: opts.bg ?? '#ffffff' }, 480)
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      const read = await scanPixels(data, canvas.width, canvas.height, true)
      if (current) setReadable(read[0]?.text === payload ? 'ok' : 'fail')
    }, 250)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [matrix, opts, payload])

  async function pickLogo(file: File) {
    const image = await decodeImage(file)
    // A modest PNG copy keeps the SVG small; the logo is never shown larger than ~22% of the code.
    const k = Math.min(1, 512 / Math.max(image.width, image.height))
    const c = newCanvas(image.width * k, image.height * k)
    c.getContext('2d')!.drawImage(image.source, 0, 0, c.width, c.height)
    image.close()
    setLogo(c.toDataURL('image/png'))
  }

  async function downloadPng() {
    if (!matrix) return
    const canvas = await toCanvas(matrix, opts, size)
    downloadBlob(await canvasBlob(canvas), `qr-${kind}.png`)
  }

  const inverted = !transparent && luminance(fg) > luminance(bg)
  const lowContrast = !transparent && (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05) < 4

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <div role="radiogroup" aria-label={t('Jenis isi', 'Content type')} className="flex flex-wrap gap-1 rounded-xl border bg-muted/60 p-1">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              onClick={() => setKind(k.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                kind === k.value ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(...k.label)}
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-5">
          {kind === 'url' && (
            <Field
              label={t('Alamat tautan', 'Link address')}
              value={url}
              onChange={setUrl}
              placeholder={t('https://contoh.com', 'https://example.com')}
              autoFocus
            />
          )}
          {kind === 'text' && (
            <Field
              label={t('Teks', 'Text')}
              value={text}
              onChange={setText}
              multiline
              placeholder={t('Tulis apa saja…', 'Write anything…')}
              autoFocus
            />
          )}
          {kind === 'wifi' && (
            <>
              <Field
                label={t('Nama jaringan (SSID)', 'Network name (SSID)')}
                value={wifi.ssid}
                onChange={(v) => setWifi({ ...wifi, ssid: v })}
                autoFocus
              />
              <Segmented
                label={t('Keamanan', 'Security')}
                value={wifi.security}
                options={[
                  { value: 'WPA', label: 'WPA/WPA2/WPA3' },
                  { value: 'WEP', label: 'WEP' },
                  { value: 'nopass', label: t('Tanpa password', 'No password') },
                ]}
                onChange={(security) => setWifi({ ...wifi, security })}
              />
              {wifi.security !== 'nopass' && (
                <Field label="Password" value={wifi.password} onChange={(v) => setWifi({ ...wifi, password: v })} />
              )}
              <Check label={t('Jaringan tersembunyi', 'Hidden network')} checked={wifi.hidden} onChange={(hidden) => setWifi({ ...wifi, hidden })} />
              <p className="text-xs text-muted-foreground">
                {t(
                  'Dipindai dengan kamera ponsel, ponsel langsung tersambung tanpa mengetik password.',
                  'Scan it with a phone camera and the phone connects right away — no typing the password.',
                )}
              </p>
            </>
          )}
          {kind === 'whatsapp' && (
            <>
              <Field label={t('Nomor WhatsApp', 'WhatsApp number')} value={wa.to} onChange={(v) => setWa({ ...wa, to: v })} placeholder="0812 3456 7890" autoFocus />
              <Field label={t('Pesan awal (opsional)', 'Opening message (optional)')} value={wa.body} onChange={(v) => setWa({ ...wa, body: v })} multiline />
              <p className="text-xs text-muted-foreground">
                {t('Nomor berawalan 0 dianggap nomor Indonesia (+62).', 'Numbers starting with 0 are treated as Indonesian (+62).')}
              </p>
            </>
          )}
          {kind === 'contact' && (
            <>
              <Field label={t('Nama', 'Name')} value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} autoFocus />
              <Field label={t('Telepon', 'Phone')} value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} />
              <Field label="Email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} />
              <Field label={t('Organisasi', 'Organization')} value={contact.org} onChange={(v) => setContact({ ...contact, org: v })} />
              <Field label={t('Situs', 'Website')} value={contact.url} onChange={(v) => setContact({ ...contact, url: v })} />
            </>
          )}
          {kind === 'email' && (
            <>
              <Field
                label={t('Kepada', 'To')}
                value={email.to}
                onChange={(v) => setEmail({ ...email, to: v })}
                placeholder={t('nama@contoh.com', 'name@example.com')}
                autoFocus
              />
              <Field label={t('Subjek', 'Subject')} value={email.subject} onChange={(v) => setEmail({ ...email, subject: v })} />
              <Field label={t('Isi', 'Message')} value={email.body} onChange={(v) => setEmail({ ...email, body: v })} multiline />
            </>
          )}
          {kind === 'phone' && <Field label={t('Nomor telepon', 'Phone number')} value={phone} onChange={setPhone} placeholder="0812 3456 7890" autoFocus />}
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <Segmented
              label={t('Bentuk', 'Shape')}
              value={style}
              options={STYLE_OPTIONS.map((o) => ({ value: o.value, label: t(...o.label) }))}
              onChange={setStyle}
            />
            <Segmented
              label={t('Tepi kosong', 'Margin')}
              value={margin}
              options={MARGIN_OPTIONS.map((o) => ({ value: o.value, label: t(...o.label) }))}
              onChange={setMargin}
            />
          </div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <ColorField label={t('Warna kode', 'Code color')} value={fg} onChange={setFg} />
            <div className="space-y-2">
              <ColorField label={t('Latar', 'Background')} value={bg} onChange={setBg} disabled={transparent} />
            </div>
            <Check label={t('Latar transparan', 'Transparent background')} checked={transparent} onChange={setTransparent} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('Logo di tengah (opsional)', 'Logo in the middle (optional)')}</p>
            <div className="flex items-center gap-3">
              {logo && <img src={logo} alt="" className="size-10 rounded-md border bg-white object-contain p-0.5" />}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                <ImagePlus className="size-4" />
                {logo ? t('Ganti logo', 'Change logo') : t('Pilih logo', 'Choose logo')}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void pickLogo(f)
                  }}
                />
              </label>
              {logo && (
                <button type="button" onClick={() => setLogo(null)} className="text-muted-foreground hover:text-foreground" aria-label={t('Hapus logo', 'Remove logo')}>
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
          <Segmented
            label={
              logo
                ? t('Koreksi kesalahan (H otomatis karena ada logo)', 'Error correction (H automatically, because of the logo)')
                : t('Koreksi kesalahan', 'Error correction')
            }
            value={effectiveLevel}
            options={LEVEL_OPTIONS}
            disabled={!!logo}
            onChange={setLevel}
          />
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div
          className={cn(
            'grid aspect-square place-items-center rounded-2xl border p-4',
            transparent ? '[background:repeating-conic-gradient(#d4d4d8_0_25%,#fff_0_50%)_0_0/16px_16px]' : 'bg-card',
          )}
        >
          {svg ? (
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="QR code" className="size-full" />
          ) : (
            <p className="px-6 text-center text-sm text-muted-foreground">
              {tooLong
                ? t(
                    'Isinya terlalu panjang untuk satu QR code. Perpendek teksnya.',
                    'The content is too long for one QR code. Shorten the text.',
                  )
                : t('Isi formulir di samping — QR code muncul di sini.', 'Fill in the form — the QR code appears here.')}
            </p>
          )}
        </div>

        {svg && (
          <>
            <Status readable={readable} />
            {(inverted || lowContrast) && (
              <Note>
                {inverted
                  ? t(
                      'Kode lebih terang dari latarnya. Sebagian pemindai gagal membaca warna terbalik.',
                      'The code is lighter than its background. Some scanners can’t read inverted colors.',
                    )
                  : t(
                      'Kontras warna rendah; QR bisa sulit dipindai, apalagi saat dicetak.',
                      'Low color contrast; the QR may be hard to scan, especially when printed.',
                    )}
              </Note>
            )}
            <Segmented label={t('Ukuran PNG', 'PNG size')} value={size} options={SIZE_OPTIONS} onChange={setSize} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void downloadPng()}>
                <Download />
                {t('Unduh PNG', 'Download PNG')}
              </Button>
              <Button variant="outline" onClick={() => downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `qr-${kind}.svg`)}>
                <Download />
                {t('Unduh SVG', 'Download SVG')}
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <div className="flex items-center justify-between border-b px-3 py-1 text-xs text-muted-foreground">
                <span>{t('Isi QR code', 'QR code content')}</span>
                <CopyButton text={payload} />
              </div>
              <pre className="max-h-32 overflow-auto p-3 font-mono text-xs break-all whitespace-pre-wrap">{payload}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Status({ readable }: { readable: 'checking' | 'ok' | 'fail' | null }) {
  const t = useT()
  if (readable === 'checking')
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t('Memeriksa apakah terbaca…', 'Checking that it scans…')}
      </p>
    )
  if (readable === 'ok')
    return (
      <p className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" />
        {t('Terbaca dengan benar oleh pemindai', 'Read correctly by the scanner')}
      </p>
    )
  if (readable === 'fail')
    return (
      <Note>
        {t(
          'Pemindai uji gagal membaca kode ini. Perbesar kontras, kecilkan logo, atau pilih bentuk Kotak.',
          'The test scanner couldn’t read this code. Increase the contrast, shrink the logo, or pick the Square shape.',
        )}
      </Note>
    )
  return null
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-destructive">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  autoFocus?: boolean
}) {
  const cls = 'w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-brand-2/60'
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cn(cls, 'resize-y py-2')} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className={cn(cls, 'h-10')} />
      )}
    </label>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 pb-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--brand-2)]" />
      {label}
    </label>
  )
}

function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="color"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="block h-10 w-14 cursor-pointer rounded-lg border bg-background p-1 disabled:opacity-40"
      />
    </label>
  )
}
