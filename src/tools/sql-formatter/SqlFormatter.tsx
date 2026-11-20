import { useEffect, useState } from 'react'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { TextFileButton } from '@/components/tool/TextFileButton'
import { useT } from '@/lib/i18n'

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Lib = typeof import('sql-formatter')
type Dialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'transactsql' | 'bigquery'
type Case = 'upper' | 'lower' | 'preserve'

/** Squeezes a query onto one line, keeping quoted text as it is and dropping comments. */
function compact(sql: string) {
  const quoted = /('(?:[^']|'')*'|"(?:[^"]|"")*"|`[^`]*`|\[[^\]]*\])/
  return sql
    .split(quoted)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\( | \)| (?=[,;])/g, (m) => m.trim()),
    )
    .join('')
    .trim()
}

export default function SqlFormatter() {
  const t = useT()
  const [lib, setLib] = useState<Lib | null>(null)
  const [input, setInput] = useState('')
  const [dialect, setDialect] = useState<Dialect>('sql')
  const [keywordCase, setKeywordCase] = useState<Case>('upper')
  const [indent, setIndent] = useState(2)
  const [mode, setMode] = useState<'format' | 'compact'>('format')

  useEffect(() => {
    void import('sql-formatter').then(setLib)
  }, [])

  let out = ''
  let error = ''
  if (input.trim() && lib) {
    try {
      const pretty = lib.format(input, { language: dialect, keywordCase, tabWidth: indent, linesBetweenQueries: 1 })
      out = mode === 'format' ? pretty : compact(pretty)
    } catch (e) {
      error = e instanceof Error ? e.message.split('\n')[0] : String(e)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Mode', 'Mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'format', label: t('Rapikan', 'Format') },
            { value: 'compact', label: t('Padatkan', 'Compact') },
          ]}
        />
        <Segmented
          label={t('Dialek', 'Dialect')}
          value={dialect}
          onChange={setDialect}
          options={[
            { value: 'sql', label: t('Umum', 'Standard') },
            { value: 'mysql', label: 'MySQL' },
            { value: 'postgresql', label: 'PostgreSQL' },
            { value: 'sqlite', label: 'SQLite' },
            { value: 'transactsql', label: 'SQL Server' },
            { value: 'bigquery', label: 'BigQuery' },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Kata kunci', 'Keywords')}
          value={keywordCase}
          onChange={setKeywordCase}
          options={[
            { value: 'upper', label: 'SELECT' },
            { value: 'lower', label: 'select' },
            { value: 'preserve', label: t('Biarkan', 'Keep') },
          ]}
        />
        {mode === 'format' && (
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          spellCheck={false}
          aria-label="SQL"
          placeholder="select id, nama from pelanggan where kota = 'Bandung' order by nama"
          className={area}
        />
        <TextFileButton accept=".sql,.txt" onText={setInput} />
      </div>
      {error && <ErrorNote message={error} />}
      {out && (
        <div className="space-y-2">
          <textarea readOnly value={out} rows={mode === 'format' ? 12 : 4} aria-label={t('Hasil', 'Result')} className={area} />
          <CopyButton text={out} variant="outline" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          'Query hanya dirapikan, tidak pernah dijalankan dan tidak dikirim ke server. Mode padatkan membuang komentar.',
          'The query is only reformatted: it is never run and never sent to a server. Compact mode drops comments.',
        )}
      </p>
    </div>
  )
}
