import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { tr, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  duration,
  estimateStrength,
  generatePassphrase,
  generatePassword,
  level,
  passphraseEntropy,
  passwordEntropy,
  secondsToGuess,
  type PassphraseOptions,
  type PasswordOptions,
} from './password'
import { WORDS_EN } from './words-en'
import { WORDS_ID } from './words-id'

type Mode = 'password' | 'passphrase' | 'check'
type WordList = 'id' | 'en' | 'mix'

const LEVELS: [string, string][] = [
  ['Lemah', 'Weak'],
  ['Cukup', 'Fair'],
  ['Kuat', 'Strong'],
  ['Sangat kuat', 'Very strong'],
  ['Luar biasa', 'Excellent'],
]
const BAR = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']

function timeText(bits: number): string {
  const d = duration(secondsToGuess(bits))
  const n = d.value.toLocaleString(tr('id-ID', 'en-US'))
  switch (d.unit) {
    case 'instant': return tr('kurang dari 1 detik', 'under 1 second')
    case 's': return tr(`${n} detik`, `${n} seconds`)
    case 'min': return tr(`${n} menit`, `${n} minutes`)
    case 'h': return tr(`${n} jam`, `${n} hours`)
    case 'd': return tr(`${n} hari`, `${n} days`)
    case 'y': return tr(`${n} tahun`, `${n} years`)
    case 'ky': return tr(`${n} ribu tahun`, `${n} thousand years`)
    case 'my': return tr(`${n} juta tahun`, `${n} million years`)
    case 'by': return tr(`${n} miliar tahun`, `${n} billion years`)
    default: return tr('lebih lama dari umur alam semesta', 'longer than the age of the universe')
  }
}

function Meter({ bits }: { bits: number }) {
  const t = useT()
  const lv = level(bits)
  return (
    <div className="space-y-2">
      <div className="flex gap-1" aria-hidden>
        {BAR.map((c, i) => (
          <div key={c} className={cn('h-1.5 flex-1 rounded-full bg-muted', i <= lv && bits > 0 && c)} />
        ))}
      </div>
      <p className="text-sm">
        <span className="font-medium">{bits > 0 ? t(...LEVELS[lv]) : '—'}</span>
        <span className="text-muted-foreground">
          {' · '}
          {Math.round(bits)} bit
          {bits > 0 && ` · ${t('perkiraan waktu menebak', 'estimated time to guess')}: ${timeText(bits)}`}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        {t(
          'Dengan asumsi penyerang mencoba 10 miliar tebakan per detik pada hash yang bocor.',
          'Assuming an attacker making 10 billion guesses per second against a leaked hash.',
        )}
      </p>
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export default function PasswordGenerator() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('password')
  const [pw, setPw] = useState<PasswordOptions>({ length: 16, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: false })
  const [pp, setPp] = useState<PassphraseOptions>({ words: 5, separator: '-', capitalize: false, number: false })
  const [list, setList] = useState<WordList>('id')
  const [out, setOut] = useState('')
  const [typed, setTyped] = useState('')

  const words = useMemo(() => (list === 'id' ? WORDS_ID : list === 'en' ? WORDS_EN : [...WORDS_ID, ...WORDS_EN]), [list])

  const regenerate = useCallback(() => {
    setOut(mode === 'password' ? generatePassword(pw) : mode === 'passphrase' ? generatePassphrase(words, pp) : '')
  }, [mode, pw, pp, words])
  useEffect(regenerate, [regenerate])

  const bits =
    mode === 'password' ? passwordEntropy(pw) : mode === 'passphrase' ? passphraseEntropy(words.length, pp) : estimateStrength(typed)

  function setKind(key: 'lower' | 'upper' | 'digits' | 'symbols', v: boolean) {
    const next = { ...pw, [key]: v }
    if (next.lower || next.upper || next.digits || next.symbols) setPw(next)
  }

  return (
    <div className="space-y-6">
      <Segmented<Mode>
        label={t('Mode', 'Mode')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'password', label: t('Password acak', 'Random password') },
          { value: 'passphrase', label: t('Passphrase', 'Passphrase') },
          { value: 'check', label: t('Cek kekuatan', 'Check strength') },
        ]}
      />

      {mode === 'check' ? (
        <div className="space-y-3">
          <PasswordInput
            label={t('Password yang diperiksa', 'Password to check')}
            value={typed}
            onChange={setTyped}
            autoComplete="new-password"
            placeholder={t('Ketik password untuk diperiksa', 'Type a password to check')}
          />
          <p className="text-xs text-muted-foreground">
            {t('Yang kamu ketik tidak dikirim ke mana pun dan tidak disimpan.', 'What you type is never sent anywhere or stored.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-3">
            <output className="min-w-0 flex-1 break-all font-mono text-lg" aria-live="polite">
              {out}
            </output>
            <Button variant="ghost" size="icon" onClick={regenerate} aria-label={t('Buat ulang', 'Regenerate')}>
              <RefreshCw />
            </Button>
            <CopyButton text={out} variant="outline" />
          </div>

          {mode === 'password' ? (
            <div className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">
                  {t('Panjang', 'Length')}: {pw.length}
                </span>
                <input
                  type="range"
                  min={4}
                  max={64}
                  value={pw.length}
                  onChange={(e) => setPw({ ...pw, length: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Check label={t('Huruf kecil (a–z)', 'Lowercase (a–z)')} checked={pw.lower} onChange={(v) => setKind('lower', v)} />
                <Check label={t('Huruf besar (A–Z)', 'Uppercase (A–Z)')} checked={pw.upper} onChange={(v) => setKind('upper', v)} />
                <Check label={t('Angka (0–9)', 'Digits (0–9)')} checked={pw.digits} onChange={(v) => setKind('digits', v)} />
                <Check label={t('Simbol (!@#$…)', 'Symbols (!@#$…)')} checked={pw.symbols} onChange={(v) => setKind('symbols', v)} />
                <Check
                  label={t('Hindari yang mirip (l I O 0 1)', 'Avoid look-alikes (l I O 0 1)')}
                  checked={pw.noAmbiguous}
                  onChange={(v) => setPw({ ...pw, noAmbiguous: v })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">
                  {t('Jumlah kata', 'Number of words')}: {pp.words}
                </span>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={pp.words}
                  onChange={(e) => setPp({ ...pp, words: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </label>
              <Segmented<WordList>
                label={t('Daftar kata', 'Word list')}
                value={list}
                onChange={setList}
                options={[
                  { value: 'id', label: t('Indonesia', 'Indonesian') },
                  { value: 'en', label: t('Inggris', 'English') },
                  { value: 'mix', label: t('Campur', 'Mixed') },
                ]}
              />
              <Segmented<string>
                label={t('Pemisah', 'Separator')}
                value={pp.separator}
                onChange={(separator) => setPp({ ...pp, separator })}
                options={[
                  { value: '-', label: '-' },
                  { value: '.', label: '.' },
                  { value: '_', label: '_' },
                  { value: ' ', label: t('spasi', 'space') },
                  { value: '', label: t('tanpa', 'none') },
                ]}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Check label={t('Awali dengan huruf besar', 'Capitalize words')} checked={pp.capitalize} onChange={(capitalize) => setPp({ ...pp, capitalize })} />
                <Check label={t('Tambah satu angka', 'Add one digit')} checked={pp.number} onChange={(number) => setPp({ ...pp, number })} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`Daftar berisi ${words.length} kata; tiap kata menambah sekitar ${Math.log2(words.length).toFixed(1)} bit.`, `The list has ${words.length} words; each adds about ${Math.log2(words.length).toFixed(1)} bits.`)}
              </p>
            </div>
          )}
        </div>
      )}

      <Meter bits={bits} />
    </div>
  )
}
