import { useMemo, useState } from 'react'
import { ArrowDownUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { base64Decode, base64Encode, decodeJwt, htmlDecode, htmlEncode, urlDecode, urlEncode, type Mode } from './codec'

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function EncodeDecode() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('base64')
  const [decode, setDecode] = useState(false)
  const [urlSafe, setUrlSafe] = useState(false)
  const [wholeUrl, setWholeUrl] = useState(false)
  const [input, setInput] = useState('')

  const isJwt = mode === 'jwt'
  const result = useMemo(() => {
    if (!input) return { out: '', error: '' }
    try {
      if (isJwt) return { out: '', error: '', jwt: decodeJwt(input) }
      if (mode === 'base64') return { out: decode ? base64Decode(input) : base64Encode(input, urlSafe), error: '' }
      if (mode === 'url') return { out: decode ? urlDecode(input) : urlEncode(input, wholeUrl), error: '' }
      return { out: decode ? htmlDecode(input) : htmlEncode(input), error: '' }
    } catch (e) {
      return { out: '', error: e instanceof Error ? e.message : String(e) }
    }
  }, [input, mode, decode, urlSafe, wholeUrl, isJwt])
  const jwt = 'jwt' in result ? result.jwt : undefined
  const pretty = (v: unknown) => JSON.stringify(v, null, 2)

  return (
    <div className="space-y-5">
      <Segmented
        label={t('Jenis', 'Type')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'base64', label: 'Base64' },
          { value: 'url', label: 'URL' },
          { value: 'html', label: 'HTML' },
          { value: 'jwt', label: 'JWT' },
        ]}
      />
      {!isJwt && (
        <div className="flex flex-wrap items-end gap-4">
          <Segmented
            label={t('Arah', 'Direction')}
            value={decode ? 'dec' : 'enc'}
            onChange={(v) => setDecode(v === 'dec')}
            options={[
              { value: 'enc', label: t('Encode', 'Encode') },
              { value: 'dec', label: t('Decode', 'Decode') },
            ]}
          />
          {mode === 'base64' && !decode && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
              {t('Aman untuk URL (- dan _, tanpa =)', 'URL-safe (- and _, no =)')}
            </label>
          )}
          {mode === 'url' && !decode && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={wholeUrl} onChange={(e) => setWholeUrl(e.target.checked)} />
              {t('Seluruh URL (biarkan : / ? & =)', 'Whole URL (keep : / ? & =)')}
            </label>
          )}
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={7}
          spellCheck={false}
          aria-label={t('Masukan', 'Input')}
          placeholder={isJwt ? t('Tempel token JWT di sini…', 'Paste a JWT here…') : t('Ketik atau tempel teks…', 'Type or paste text…')}
          className={area}
        />
        {!isJwt && (
          <Button
            variant="outline"
            size="sm"
            disabled={!result.out}
            onClick={() => {
              setInput(result.out)
              setDecode(!decode)
            }}
          >
            <ArrowDownUp />
            {t('Pakai hasil sebagai masukan', 'Use result as input')}
          </Button>
        )}
      </div>

      {result.error && <ErrorNote message={result.error} />}

      {!isJwt && result.out && (
        <div className="space-y-2">
          <textarea readOnly value={result.out} rows={7} aria-label={t('Hasil', 'Result')} className={area} />
          <CopyButton text={result.out} variant="outline" />
        </div>
      )}

      {jwt && (
        <div className="space-y-4">
          {(['header', 'payload'] as const).map((k) => (
            <div key={k} className="space-y-1">
              <h3 className="text-sm font-medium">{k === 'header' ? 'Header' : 'Payload'}</h3>
              <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-3 text-xs">{pretty(jwt[k])}</pre>
              <CopyButton text={pretty(jwt[k])} variant="outline" />
            </div>
          ))}
          {jwt.times.length > 0 && (
            <ul className="space-y-1 text-sm">
              {jwt.times.map((x) => (
                <li key={x.name}>
                  <span className="font-mono">{x.name}</span>: {x.date.toLocaleString(locale())}
                  {x.name === 'exp' && (
                    <span className={x.date.getTime() < Date.now() ? ' text-destructive' : ' text-muted-foreground'}>
                      {' '}
                      · {x.date.getTime() < Date.now() ? t('sudah kedaluwarsa', 'expired') : t('masih berlaku', 'still valid')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {t(
              'Hanya dibaca, tanda tangan tidak diverifikasi: jangan percaya isi token hanya dari tool ini. Token tidak dikirim ke mana pun.',
              'Decoded only; the signature is not verified, so do not trust a token on this alone. The token is never sent anywhere.',
            )}
          </p>
        </div>
      )}
    </div>
  )
}
