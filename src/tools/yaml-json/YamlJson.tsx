import { useEffect, useState } from 'react'
import { ArrowDownUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { TextFileButton } from '@/components/tool/TextFileButton'
import { tr, useT } from '@/lib/i18n'

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

type YamlLib = typeof import('yaml')

/** Line and column of a JSON.parse error, from the "position N" in its message. */
function jsonErrorAt(text: string, message: string) {
  const pos = /position (\d+)/.exec(message)
  if (!pos) return message
  const before = text.slice(0, Number(pos[1]))
  const line = before.split('\n').length
  const col = Number(pos[1]) - before.lastIndexOf('\n')
  return tr(`Baris ${line}, kolom ${col}: ${message}`, `Line ${line}, column ${col}: ${message}`)
}

function convert(lib: YamlLib, input: string, toJson: boolean, indent: number) {
  if (toJson) {
    // Several documents separated by "---" become an array.
    const docs = lib.parseAllDocuments(input, { prettyErrors: true })
    const list = Array.isArray(docs) ? docs : [docs]
    for (const d of list) {
      const err = d.errors[0]
      if (err) {
        const at = err.linePos?.[0]
        throw new Error(at ? tr(`Baris ${at.line}, kolom ${at.col}: `, `Line ${at.line}, column ${at.col}: `) + err.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '') : err.message)
      }
    }
    const values = list.map((d) => d.toJS({ maxAliasCount: 1000 }))
    return { out: JSON.stringify(values.length === 1 ? values[0] : values, null, indent || undefined), docs: list.length }
  }
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch (e) {
    throw new Error(jsonErrorAt(input, e instanceof Error ? e.message : String(e)))
  }
  return { out: lib.stringify(data, { indent: indent || 2, lineWidth: 0 }), docs: 1 }
}

export default function YamlJson() {
  const t = useT()
  const [toJson, setToJson] = useState(true)
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState(2)
  const [lib, setLib] = useState<YamlLib | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    import('yaml').then(setLib, (e) => setLoadError(String(e)))
  }, [])

  let result = { out: '', docs: 0, error: '' }
  if (lib && input.trim()) {
    try {
      result = { ...convert(lib, input, toJson, indent), error: '' }
    } catch (e) {
      result = { out: '', docs: 0, error: e instanceof Error ? e.message : String(e) }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Arah', 'Direction')}
          value={toJson ? 'json' : 'yaml'}
          onChange={(v) => setToJson(v === 'json')}
          options={[
            { value: 'json', label: 'YAML → JSON' },
            { value: 'yaml', label: 'JSON → YAML' },
          ]}
        />
        <Segmented
          label={t('Indentasi', 'Indent')}
          value={indent}
          onChange={setIndent}
          options={[
            { value: 2, label: '2' },
            { value: 4, label: '4' },
            ...(toJson ? [{ value: 0, label: t('Satu baris', 'One line') }] : []),
          ]}
        />
      </div>
      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          spellCheck={false}
          aria-label={t('Masukan', 'Input')}
          placeholder={toJson ? 'nama: toowl\nfitur:\n  - pdf\n  - foto' : '{"nama": "toowl", "fitur": ["pdf", "foto"]}'}
          className={area}
        />
        <div className="flex flex-wrap gap-2">
          <TextFileButton accept={toJson ? '.yaml,.yml,text/yaml' : '.json,application/json'} onText={setInput} />
          <Button
            variant="outline"
            size="sm"
            disabled={!result.out}
            onClick={() => {
              setInput(result.out)
              setToJson(!toJson)
            }}
          >
            <ArrowDownUp />
            {t('Pakai hasil sebagai masukan', 'Use result as input')}
          </Button>
        </div>
      </div>
      {(loadError || result.error) && <ErrorNote message={loadError || result.error} />}
      {result.out && (
        <div className="space-y-2">
          {result.docs > 1 && (
            <p className="text-xs text-muted-foreground">
              {t(`${result.docs} dokumen (dipisah ---) digabung jadi satu array.`, `${result.docs} documents (split by ---) combined into one array.`)}
            </p>
          )}
          <textarea readOnly value={result.out} rows={10} aria-label={t('Hasil', 'Result')} className={area} />
          <CopyButton text={result.out} variant="outline" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          'Komentar YAML (# …) tidak ikut ke JSON karena JSON tidak punya komentar. Anchor dan alias (&, *) diuraikan jadi nilainya.',
          'YAML comments (# …) are dropped because JSON has no comments. Anchors and aliases (&, *) are expanded into their values.',
        )}
      </p>
    </div>
  )
}
