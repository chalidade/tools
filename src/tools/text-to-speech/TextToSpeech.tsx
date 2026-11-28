import { useEffect, useRef, useState } from 'react'
import { AudioLines, Download, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { locale, useLang, useT, tr, type Lang } from '@/lib/i18n'
import { timestampName } from '@/lib/local-store'
import {
  AUDIO_OUTPUTS,
  NoEncoderError,
  convertMedia,
  ensureAudioEncoder,
  formatDuration,
  hasWebCodecs,
  isCanceled,
  type AudioOut,
} from '@/lib/media'
import { preloadEspeak } from './espeak'
import { MAX_TEXT, SpeechCanceled, VOICES, speak, voiceById, wavBlob, type VoiceId } from './tts'

const STORE = 'tools:text-to-speech'

const area =
  'w-full resize-y rounded-xl border bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring'

const SAMPLE: Record<Lang, string> = {
  id: 'Halo semuanya! Hari ini aku mau berbagi tiga tips hemat belanja bulanan.\nPertama, buat daftar belanja sebelum berangkat.',
  en: "Hi everyone! Today I'm sharing three easy ways to save on groceries.\nFirst, write a shopping list before you leave.",
}

interface Prefs {
  lang: Lang
  voice: VoiceId
  speed: number
  pitch: number
  format: AudioOut
}

function loadPrefs(uiLang: Lang): Prefs {
  const fallback: Prefs = { lang: uiLang, voice: uiLang === 'en' ? 'en-neural' : 'id-f', speed: 1, pitch: 50, format: 'mp3' }
  try {
    const p = { ...fallback, ...JSON.parse(localStorage.getItem(STORE) ?? '{}') }
    const voice = voiceById(p.voice)
    return {
      lang: voice.lang,
      voice: voice.id,
      speed: Math.min(2, Math.max(0.5, Number(p.speed) || 1)),
      pitch: Math.min(99, Math.max(0, Math.round(p.pitch) || 50)),
      format: p.format in AUDIO_OUTPUTS ? p.format : 'mp3',
    }
  } catch {
    return fallback
  }
}

interface Result {
  wav: Blob
  url: string
  duration: number
}

export default function TextToSpeech() {
  const t = useT()
  const uiLang = useLang()
  const [prefs, setPrefs] = useState(() => loadPrefs(uiLang))
  const [text, setText] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const cancel = useRef(false)
  const voice = voiceById(prefs.voice)
  const mp3Ok = hasWebCodecs()
  const format = mp3Ok ? prefs.format : 'wav'

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs))
    } catch {
      /* private mode */
    }
  }, [prefs])

  // The espeak wasm turns text into sound for every voice: fetch it while the visitor types.
  useEffect(preloadEspeak, [])

  // A result belongs to the text and settings it was made from.
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])
  const clearResult = () => setResult(null)

  const setPref = (next: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...next }))
    clearResult()
  }

  function pickLang(lang: Lang) {
    if (lang === prefs.lang) return
    setPref({ lang, voice: (lang === 'en' ? 'en-neural' : 'id-f') as VoiceId })
  }

  async function generate() {
    const input = text.trim() || SAMPLE[prefs.lang]
    if (!text.trim()) setText(input)
    setError('')
    clearResult()
    cancel.current = false
    setProgress(0)
    try {
      const { samples, rate } = await speak(input, {
        voice,
        speed: prefs.speed,
        pitch: prefs.pitch,
        onProgress: setProgress,
        isCanceled: () => cancel.current,
      })
      if (!samples.length) throw new Error('empty')
      const wav = wavBlob(samples, rate)
      setResult({ wav, url: URL.createObjectURL(wav), duration: samples.length / rate })
    } catch (e) {
      if (!(e instanceof SpeechCanceled)) {
        console.error(e)
        setError(
          t(
            'Suara tidak bisa dibuat. Periksa koneksi untuk unduhan pertama mesin suara, lalu coba lagi.',
            "The speech couldn't be made. Check your connection for the voice engine's first download, then try again.",
          ),
        )
      }
    } finally {
      setProgress(null)
    }
  }

  async function save() {
    if (!result) return
    setError('')
    const name = timestampName(tr('Suara', 'Speech')).replace(/[\\/:*?"<>|]+/g, '-')
    const choice = AUDIO_OUTPUTS[format]
    if (!choice.codec) {
      downloadBlob(result.wav, `${name}.wav`)
      return
    }
    setSaving(0)
    try {
      if (!(await ensureAudioEncoder(choice.codec))) throw new NoEncoderError(format)
      const blob = await convertMedia({
        file: new File([result.wav], `${name}.wav`, { type: 'audio/wav' }),
        format: choice.format,
        mimeType: choice.mimeType,
        // 44.1 kHz stereo: what video editors and social apps expect from a voice-over track.
        audio: { codec: choice.codec, bitrate: 160_000, sampleRate: 44_100, numberOfChannels: 2 },
        onProgress: setSaving,
      })
      downloadBlob(blob, `${name}.${choice.ext}`)
    } catch (e) {
      if (!isCanceled(e))
        setError(
          e instanceof NoEncoderError
            ? t('Browser ini tidak punya pengode untuk format itu. Coba WAV.', 'This browser has no encoder for that format. Try WAV.')
            : t('Suara tidak bisa diubah ke format itu. Coba WAV.', "The speech couldn't be converted to that format. Try WAV."),
        )
    } finally {
      setSaving(null)
    }
  }

  const busy = progress !== null
  const voices = VOICES.filter((v) => v.lang === prefs.lang)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Bahasa', 'Language')}
          value={prefs.lang}
          disabled={busy}
          options={[
            { value: 'id', label: 'Indonesia' },
            { value: 'en', label: 'English' },
          ]}
          onChange={pickLang}
        />
        <Segmented
          label={t('Suara', 'Voice')}
          value={prefs.voice}
          disabled={busy}
          options={voices.map((v) => ({ value: v.id, label: t(...v.label) }))}
          onChange={(v) => setPref({ voice: v })}
        />
      </div>

      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, MAX_TEXT))
            clearResult()
          }}
          rows={8}
          maxLength={MAX_TEXT}
          disabled={busy}
          aria-label={t('Teks', 'Text')}
          placeholder={SAMPLE[prefs.lang]}
          className={area}
        />
        <p className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>
            {t(
              'Satu baris = satu kalimat. Baris kosong = jeda lebih panjang.',
              'One line = one sentence. A blank line = a longer pause.',
            )}
          </span>
          <span className="font-mono tabular-nums">
            {text.length.toLocaleString(locale())}/{MAX_TEXT.toLocaleString(locale())}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="flex justify-between text-xs font-medium text-muted-foreground">
            {t('Kecepatan', 'Speed')}
            <span className="font-mono tabular-nums">{prefs.speed.toFixed(2)}×</span>
          </span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={prefs.speed}
            disabled={busy}
            onChange={(e) => setPref({ speed: Number(e.target.value) })}
            className="block w-full accent-[var(--brand-2)]"
          />
        </label>
        {voice.engine === 'espeak' && (
          <label className="block space-y-2">
            <span className="flex justify-between text-xs font-medium text-muted-foreground">
              {t('Nada', 'Pitch')}
              <span className="font-mono tabular-nums">{prefs.pitch}</span>
            </span>
            <input
              type="range"
              min={0}
              max={99}
              step={1}
              value={prefs.pitch}
              disabled={busy}
              onChange={(e) => setPref({ pitch: Number(e.target.value) })}
              className="block w-full accent-[var(--brand-2)]"
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <AudioLines />}
          {busy ? `${Math.round((progress ?? 0) * 100)}%` : t('Buat suara', 'Make speech')}
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => (cancel.current = true)}>
            <X />
            {t('Batal', 'Cancel')}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {voice.engine === 'piper'
            ? t(
                'Suara AI: unduhan pertama ±65 MB, setelah itu tersimpan di browser.',
                'AI voice: about 65 MB on first use, then cached by the browser.',
              )
            : t('Unduhan pertama ±18 MB, setelah itu tersimpan di browser.', 'About 18 MB on first use, then cached by the browser.')}
        </span>
      </div>

      {error && <ErrorNote message={error} />}

      {result && (
        <div className="space-y-4 rounded-2xl border p-4">
          <audio controls src={result.url} className="w-full" />
          <div className="flex flex-wrap items-end gap-4">
            <Segmented
              label={`${t('Simpan sebagai', 'Save as')} · ${formatDuration(result.duration)}`}
              value={format}
              disabled={saving !== null}
              options={[
                ...(mp3Ok
                  ? [
                      { value: 'mp3' as const, label: 'MP3' },
                      { value: 'm4a' as const, label: 'M4A' },
                    ]
                  : []),
                { value: 'wav' as const, label: 'WAV' },
              ]}
              onChange={(f) => setPrefs((p) => ({ ...p, format: f }))}
            />
            <Button onClick={save} disabled={saving !== null}>
              {saving !== null ? <Loader2 className="animate-spin" /> : <Download />}
              {saving !== null ? `${Math.round(saving * 100)}%` : t('Unduh audio', 'Download audio')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              'Pakai sebagai voice-over di CapCut, TikTok, Reels, atau video presentasi.',
              'Use it as a voice-over in CapCut, TikTok, Reels or a presentation video.',
            )}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {prefs.lang === 'id'
          ? t(
              'Suara bahasa Indonesia dibuat dengan eSpeak NG: jelas dan cepat, tapi masih terdengar seperti robot. Semua diproses di perangkatmu, teks tidak dikirim ke mana pun.',
              'Indonesian speech is made with eSpeak NG: clear and fast, but it still sounds robotic. Everything runs on your device; the text is never sent anywhere.',
            )
          : t(
              'Suara Joe adalah model AI Piper (CC0) yang jalan di perangkatmu. Teks tidak dikirim ke mana pun.',
              'The Joe voice is a Piper AI model (CC0) running on your device. The text is never sent anywhere.',
            )}
      </p>
    </div>
  )
}
