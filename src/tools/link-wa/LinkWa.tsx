import { useEffect, useState } from 'react'
import { Download, MessageCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { downloadBlob } from '@/lib/download'
import { canvasBlob } from '@/lib/image'
import { useT } from '@/lib/i18n'
import { buildWhatsApp, internationalPhone } from '@/tools/qr/payload'
import { qrMatrix, toCanvas, toSvg, type QrMatrix, type RenderOptions } from '@/tools/qr/render'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
const RENDER: RenderOptions = { fg: '#000000', bg: '#ffffff', margin: 4, style: 'square', logo: null }
const KEY = 'link-wa:number'

function stored() {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export default function LinkWa() {
  const t = useT()
  const [phone, setPhone] = useState(stored)
  const [message, setMessage] = useState('')
  const [remember, setRemember] = useState(() => stored() !== '')
  const [matrix, setMatrix] = useState<QrMatrix | null>(null)

  const digits = internationalPhone(phone)
  // 8–15 digits is the E.164 range; shorter is a typo, longer cannot be a phone number.
  const valid = digits.length >= 8 && digits.length <= 15
  const link = valid ? buildWhatsApp({ to: phone, subject: '', body: message }) : ''

  useEffect(() => {
    try {
      if (remember && valid) localStorage.setItem(KEY, phone)
      else localStorage.removeItem(KEY)
    } catch {
      // Storage blocked: nothing is remembered.
    }
  }, [remember, valid, phone])

  useEffect(() => {
    let live = true
    if (!link) return setMatrix(null)
    void qrMatrix(link, 'M').then((m) => live && setMatrix(m))
    return () => {
      live = false
    }
  }, [link])

  const svg = matrix ? toSvg(matrix, RENDER) : ''

  async function png() {
    if (matrix) downloadBlob(await canvasBlob(await toCanvas(matrix, RENDER, 1024)), `wa-${digits}.png`)
  }

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Nomor WhatsApp', 'WhatsApp number')}
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="0812-3456-7890" />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Pesan (opsional)', 'Message (optional)')}
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={inputCls} placeholder={t('Halo, saya mau tanya…', 'Hi, I would like to ask…')} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4" />
          {t('Ingat nomor ini di perangkat ini', 'Remember this number on this device')}
        </label>
      </div>

      {phone.trim() && !valid && (
        <p className="text-sm text-destructive">
          {t('Nomor tampak belum lengkap. Contoh: 0812-3456-7890 atau +62 812 3456 7890.', 'The number looks incomplete. Example: 0812-3456-7890 or +62 812 3456 7890.')}
        </p>
      )}

      {link ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('Nomor dikirim ke WhatsApp sebagai', 'Sent to WhatsApp as')} <span className="font-medium text-foreground tabular-nums">+{digits}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={link} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
              <MessageCircle className="size-4" />
              {t('Chat sekarang', 'Chat now')}
            </a>
            <CopyButton text={link} label={t('Salin link', 'Copy link')} variant="outline" />
          </div>
          <p className="break-all rounded-xl border bg-muted/40 p-3 text-sm">{link}</p>
          {svg && (
            <div className="space-y-3">
              <div className="w-56 max-w-full overflow-hidden rounded-2xl border bg-white p-1" dangerouslySetInnerHTML={{ __html: svg }} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={png}>
                  <Download className="size-4" />
                  PNG
                </Button>
                <Button variant="outline" onClick={() => downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `wa-${digits}.svg`)}>
                  <Download className="size-4" />
                  SVG
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        !phone.trim() && <p className="text-sm text-muted-foreground">{t('Isi nomor untuk membuat link chat tanpa menyimpan kontak.', 'Enter a number to make a chat link without saving the contact.')}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Nomor berawal 0 dianggap Indonesia (+62). Link dibuat di perangkat ini; pesan dan nomor tidak dikirim ke server mana pun. Nomor hanya disimpan bila kotak "Ingat" dicentang.',
          'A number starting with 0 is treated as Indonesian (+62). The link is built on this device; the message and number are not sent to any server. The number is stored only if "Remember" is ticked.',
        )}
      </p>
    </div>
  )
}
