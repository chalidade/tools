import { useState } from 'react'
import { Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { useLang, useT } from '@/lib/i18n'
import { pageUrl } from '@/lib/route'
import { ACTIONS, apply, type Action } from './convert'

export default function UbahHuruf() {
  const t = useT()
  const lang = useLang()
  const [text, setText] = useState('')
  const [history, setHistory] = useState<string[]>([])

  function run(action: Action) {
    const next = apply(action, text)
    if (next === text) return
    setHistory((h) => [...h.slice(-19), text])
    setText(next)
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h
      setText(h[h.length - 1])
      return h.slice(0, -1)
    })
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        spellCheck={false}
        aria-label={t('Teks', 'Text')}
        placeholder={t('Ketik atau tempel teks di sini…', 'Type or paste text here…')}
        className="w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map((a) => (
          <Button key={a.id} variant="outline" disabled={!text} onClick={() => run(a.id)}>
            {t(...a.label)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} variant="outline" />
        <Button variant="outline" size="sm" disabled={!history.length} onClick={undo}>
          <Undo2 />
          {t('Urungkan', 'Undo')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!text}
          onClick={() => {
            setHistory((h) => [...h.slice(-19), text])
            setText('')
          }}
        >
          <Trash2 />
          {t('Kosongkan', 'Clear')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('Perlu menghitung kata? Buka ', 'Need a word count? Open ')}
        <a href={pageUrl('word-counter', lang)} className="underline underline-offset-2">
          {t('Penghitung Kata', 'Word Counter')}
        </a>
        .
      </p>
    </div>
  )
}
