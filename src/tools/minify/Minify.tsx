import { useEffect, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { SizeResult } from '@/components/tool/SizeResult'
import { TextFileButton } from '@/components/tool/TextFileButton'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import type { Lang, Mode } from './errors'
import type { MinifyJob, MinifyReply } from './workers/serve'

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

const bytes = (s: string) => new TextEncoder().encode(s).length

/** Size after gzip, as a web server would send it. */
async function gzipSize(s: string) {
  if (typeof CompressionStream === 'undefined') return null
  const stream = new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))
  return (await new Response(stream).arrayBuffer()).byteLength
}

const guessLang = (name: string): Lang | null =>
  /\.(m?js|cjs|jsx|ts)$/i.test(name) ? 'js' : /\.css$/i.test(name) ? 'css' : /\.html?$/i.test(name) ? 'html' : null

/** One worker file per library, so only the one needed is downloaded. */
function spawn(lang: Lang, mode: Mode) {
  if (mode === 'beautify') return new Worker(new URL('./workers/beautify.ts', import.meta.url), { type: 'module' })
  if (lang === 'js') return new Worker(new URL('./workers/js.ts', import.meta.url), { type: 'module' })
  if (lang === 'css') return new Worker(new URL('./workers/css.ts', import.meta.url), { type: 'module' })
  return new Worker(new URL('./workers/html.ts', import.meta.url), { type: 'module' })
}

const EXT: Record<Lang, string> = { html: 'html', css: 'css', js: 'js' }

export default function Minify() {
  const t = useT()
  const [lang, setLang] = useState<Lang>('js')
  const [mode, setMode] = useState<Mode>('minify')
  const [indent, setIndent] = useState(2)
  const [code, setCode] = useState('')
  const [name, setName] = useState('kode')
  const [out, setOut] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [gz, setGz] = useState<[number, number] | null>(null)
  const worker = useRef<Worker | null>(null)

  useEffect(() => () => worker.current?.terminate(), [])

  // Re-run a moment after typing stops.
  useEffect(() => {
    setGz(null)
    if (!code.trim()) {
      setOut('')
      setError('')
      return
    }
    const id = setTimeout(() => {
      worker.current?.terminate()
      const w = spawn(lang, mode)
      worker.current = w
      setBusy(true)
      w.onmessage = (e: MessageEvent<MinifyReply>) => {
        w.terminate()
        setBusy(false)
        if ('out' in e.data) {
          setOut(e.data.out)
          setError('')
        } else {
          const { line, col } = e.data
          setOut('')
          setError((line ? tr(`Baris ${line}, kolom ${(col ?? 0) + 1}: `, `Line ${line}, column ${(col ?? 0) + 1}: `) : '') + e.data.error)
        }
      }
      w.postMessage({ lang, mode, code, indent } satisfies MinifyJob)
    }, 300)
    return () => clearTimeout(id)
  }, [code, lang, mode, indent])

  useEffect(() => {
    if (!out || mode !== 'minify') return
    let live = true
    void Promise.all([gzipSize(code), gzipSize(out)]).then(([a, b]) => live && a !== null && b !== null && setGz([a, b]))
    return () => {
      live = false
    }
  }, [out, code, mode])

  const suffix = mode === 'minify' ? '.min' : ''

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Bahasa', 'Language')}
          value={lang}
          onChange={setLang}
          options={[
            { value: 'js', label: 'JavaScript' },
            { value: 'css', label: 'CSS' },
            { value: 'html', label: 'HTML' },
          ]}
        />
        <Segmented
          label={t('Mode', 'Mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'minify', label: t('Kecilkan', 'Minify') },
            { value: 'beautify', label: t('Rapikan', 'Beautify') },
          ]}
        />
        {mode === 'beautify' && (
          <Segmented
            label={t('Indentasi', 'Indent')}
            value={indent}
            onChange={setIndent}
            options={[
              { value: 2, label: '2' },
              { value: 4, label: '4' },
            ]}
          />
        )}
      </div>
      <div className="space-y-2">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={10}
          spellCheck={false}
          aria-label={t('Kode', 'Code')}
          placeholder={t('Tempel kode di sini…', 'Paste code here…')}
          className={area}
        />
        <TextFileButton
          accept=".js,.mjs,.cjs,.css,.html,.htm"
          onText={(text, file) => {
            const guessed = guessLang(file)
            if (guessed) setLang(guessed)
            setName(file.replace(/(\.min)?\.[^.]+$/, '') || 'kode')
            setCode(text)
          }}
        />
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('Memproses…', 'Working…')}
        </p>
      )}
      {error && <ErrorNote message={error} />}

      {out && !error && (
        <div className="space-y-3">
          {mode === 'minify' && (
            <SizeResult before={bytes(code)} after={bytes(out)}>
              <p className="text-sm text-muted-foreground">
                {gz
                  ? t(`Setelah gzip: ${(gz[0] / 1024).toFixed(1)} KB → ${(gz[1] / 1024).toFixed(1)} KB`, `After gzip: ${(gz[0] / 1024).toFixed(1)} KB → ${(gz[1] / 1024).toFixed(1)} KB`)
                  : t('Ukuran setelah gzip dihitung…', 'Working out the gzip size…')}
              </p>
            </SizeResult>
          )}
          <textarea readOnly value={out} rows={10} aria-label={t('Hasil', 'Result')} className={area} />
          <div className="flex gap-2">
            <CopyButton text={out} variant="outline" />
            <Button size="sm" onClick={() => downloadBlob(new Blob([out], { type: 'text/plain' }), `${name}${suffix}.${EXT[lang]}`)}>
              <Download />
              {t('Unduh', 'Download')}
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          'JavaScript dikecilkan dengan Terser, CSS dengan CSSO, dan HTML dengan merapatkan spasi serta mengecilkan <script> dan <style> di dalamnya. Komentar /*! … */ (lisensi) tetap disimpan. Uji hasilnya sebelum dipakai di produksi.',
          'JavaScript is minified with Terser, CSS with CSSO, and HTML by collapsing whitespace and minifying the <script> and <style> inside it. /*! … */ (licence) comments are kept. Test the result before using it in production.',
        )}
      </p>
    </div>
  )
}
