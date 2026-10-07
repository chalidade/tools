import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Bold,
  Check,
  Code,
  Download,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  PenLine,
  Pin,
  PinOff,
  Plus,
  Quote,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { downloadBlob } from '@/lib/download'
import { newId, safeFileName } from '@/lib/local-store'
import {
  NOTE_COLORS,
  WELCOME_BODY,
  continueList,
  deleteNote,
  displayTitle,
  isNoteList,
  listNotes,
  noteAsMarkdown,
  prefixLines,
  renderMarkdown,
  saveNote,
  snippet,
  taskCount,
  toggleTask,
  wrap,
  type Note,
  type NoteColor,
} from './notes'

const WELCOMED_KEY = 'tools:notes-welcomed'
const SAVE_DELAY = 400

const sortNotes = (list: Note[]) =>
  [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)

const dateText = (t: number) => {
  const d = new Date(t)
  const today = new Date()
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function blankNote(): Note {
  const now = Date.now()
  return { id: newId(), title: '', body: '', color: 'none', pinned: false, createdAt: now, updatedAt: now }
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loaded, setLoaded] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const notesRef = useRef(notes)
  notesRef.current = notes
  const timers = useRef(new Map<string, number>())
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const persist = useCallback((note: Note) => {
    setSaving(true)
    saveNote(note)
      .then(() => setSaving(false))
      .catch(() => setError('Catatan tidak bisa disimpan di browser ini (penyimpanan penuh atau mode privat).'))
  }, [])

  // Load; the very first visit gets a short welcome note.
  useEffect(() => {
    listNotes()
      .then(async (list) => {
        let welcomed = true
        try {
          welcomed = !!localStorage.getItem(WELCOMED_KEY)
          localStorage.setItem(WELCOMED_KEY, '1')
        } catch {
          // Private mode: skip the welcome note.
        }
        if (!list.length && !welcomed) {
          const welcome = { ...blankNote(), title: 'Selamat datang di Catatan', color: 'yellow' as NoteColor }
          welcome.body = WELCOME_BODY
          await saveNote(welcome)
          list = [welcome]
        }
        setNotes(sortNotes(list))
        if (list.length && window.matchMedia('(min-width: 768px)').matches) setCurrentId(sortNotes(list)[0].id)
      })
      .catch(() => setError('Penyimpanan browser tidak bisa dibuka (mode privat?), jadi catatan tidak bisa disimpan.'))
      .finally(() => setLoaded(true))
  }, [])

  // Saves anything still pending when leaving the page.
  useEffect(
    () => () => {
      for (const [id, t] of timers.current) {
        clearTimeout(t)
        const note = notesRef.current.find((n) => n.id === id)
        if (note) void saveNote(note)
      }
    },
    [],
  )

  const current = notes.find((n) => n.id === currentId) ?? null

  /** Edits a note right away on screen, and saves it a moment after typing stops. */
  const update = useCallback(
    (id: string, patch: Partial<Note>, opts: { touch?: boolean } = {}) => {
      setNotes((list) => {
        const next = list.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: opts.touch === false ? n.updatedAt : Date.now() } : n,
        )
        const note = next.find((n) => n.id === id)
        if (note) {
          clearTimeout(timers.current.get(id))
          timers.current.set(
            id,
            window.setTimeout(() => {
              timers.current.delete(id)
              persist(note)
            }, SAVE_DELAY),
          )
        }
        return next
      })
    },
    [persist],
  )

  function create() {
    const note = blankNote()
    setNotes((list) => [note, ...list])
    setCurrentId(note.id)
    setView('edit')
    setConfirming(false)
    setQuery('')
    persist(note)
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  function open(id: string) {
    setCurrentId(id)
    setConfirming(false)
  }

  function remove() {
    if (!current) return
    clearTimeout(timers.current.get(current.id))
    timers.current.delete(current.id)
    const rest = notes.filter((n) => n.id !== current.id)
    setNotes(rest)
    setCurrentId(window.matchMedia('(min-width: 768px)').matches ? (rest[0]?.id ?? null) : null)
    setConfirming(false)
    void deleteNote(current.id).catch(() => {})
  }

  // ------------------------------------------------------------- editor helpers

  function edit(fn: (text: string, start: number, end: number) => { text: string; start: number; end: number }) {
    const el = bodyRef.current
    if (!el || !current) return
    const r = fn(current.body, el.selectionStart, el.selectionEnd)
    update(current.id, { body: r.text })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(r.start, r.end)
    })
  }
  const bold = () => edit((t, s, e) => wrap(t, s, e, '**', 'tebal'))
  const italic = () => edit((t, s, e) => wrap(t, s, e, '_', 'miring'))
  const code = () => edit((t, s, e) => wrap(t, s, e, '`', 'kode'))
  const link = () =>
    edit((t, s, e) => {
      const label = t.slice(s, e) || 'teks tautan'
      const inserted = `[${label}](https://)`
      const urlAt = s + label.length + 3
      return { text: t.slice(0, s) + inserted + t.slice(e), start: urlAt, end: urlAt + 8 }
    })
  const prefix = (p: string) => edit((t, s, e) => prefixLines(t, s, e, p))

  // Checklist boxes in the preview are live: clicking one edits the source.
  const html = useMemo(() => (current && view === 'preview' ? renderMarkdown(current.body) : ''), [current, view])
  useEffect(() => {
    previewRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box, i) => {
      box.disabled = false
      box.dataset.task = String(i)
    })
  }, [html])

  // ------------------------------------------------------------- backup

  function backup() {
    downloadBlob(new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }), 'catatan-cadangan.json')
  }
  async function restore(file: File | undefined) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!isNoteList(parsed)) throw new Error('bukan cadangan catatan')
      // Merge: a note in the file replaces the one here only if it's newer.
      const byId = new Map(notes.map((n) => [n.id, n]))
      const incoming = parsed.map((n) => ({
        ...blankNote(),
        ...n,
        color: NOTE_COLORS.some((c) => c.id === n.color) ? n.color : 'none',
      }))
      const changed = incoming.filter((n) => !byId.has(n.id) || byId.get(n.id)!.updatedAt < n.updatedAt)
      for (const n of changed) {
        byId.set(n.id, n)
        await saveNote(n)
      }
      setNotes(sortNotes([...byId.values()]))
      setError('')
    } catch {
      setError('File itu bukan cadangan dari tool Catatan ini (.json).')
    }
  }

  // ------------------------------------------------------------- UI

  const q = query.trim().toLowerCase()
  const visible = sortNotes(notes).filter(
    (n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
  )

  return (
    <div className="space-y-4">
      <div className="grid min-h-[70vh] overflow-hidden rounded-3xl border bg-card shadow-xs md:grid-cols-[19rem_minmax(0,1fr)]">
        {/* List */}
        <aside className={cn('flex min-h-0 flex-col border-b md:border-r md:border-b-0', current && 'max-md:hidden')}>
          <div className="flex items-center gap-2 border-b p-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Cari catatan</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari catatan…"
                className="h-9 w-full rounded-xl border bg-background pr-3 pl-9 text-sm outline-none focus:border-brand-2/50"
              />
            </label>
            <Button size="sm" onClick={create} aria-label="Catatan baru" title="Catatan baru">
              <Plus className="size-4" />
            </Button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {loaded && visible.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                {q ? `Tidak ada catatan berisi “${query}”.` : 'Belum ada catatan.'}
                {!q && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={create}>
                    <Plus className="size-4" /> Tulis catatan
                  </Button>
                )}
              </li>
            )}
            {visible.map((n) => {
              const tasks = taskCount(n.body)
              const swatch = NOTE_COLORS.find((c) => c.id === n.color)?.swatch
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n.id)}
                    className={cn(
                      'relative w-full overflow-hidden rounded-xl px-3 py-2.5 pl-4 text-left transition-colors',
                      n.id === currentId ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                  >
                    {n.color !== 'none' && (
                      <span className="absolute inset-y-2 left-1 w-1 rounded-full" style={{ background: swatch }} />
                    )}
                    <span className="flex items-center gap-1.5">
                      {n.pinned && <Pin className="size-3 shrink-0 text-brand-2" />}
                      <span className="truncate text-sm font-medium">{displayTitle(n)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{snippet(n) || 'Kosong'}</span>
                    <span className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      {dateText(n.updatedAt)}
                      {tasks.total > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Check className="size-3" />
                          {tasks.done}/{tasks.total}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-1 border-t p-2">
            <Button size="sm" variant="ghost" className="flex-1" onClick={backup} disabled={!notes.length}>
              <Download className="size-4" /> Cadangkan
            </Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Pulihkan
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                void restore(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </aside>

        {/* Editor */}
        <section className={cn('flex min-h-0 flex-col', !current && 'max-md:hidden')}>
          {!current ? (
            <div className="grid flex-1 place-items-center p-10 text-center text-sm text-muted-foreground">
              <div>
                <p>Pilih catatan di samping, atau buat yang baru.</p>
                <Button size="sm" className="mt-4" onClick={create}>
                  <Plus className="size-4" /> Catatan baru
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1 border-b p-2">
                <button
                  type="button"
                  onClick={() => setCurrentId(null)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent md:hidden"
                  aria-label="Kembali ke daftar"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex rounded-xl bg-muted/60 p-0.5">
                  {(['edit', 'preview'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={cn(
                        'flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors',
                        view === v ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {v === 'edit' ? <PenLine className="size-3.5" /> : <Eye className="size-3.5" />}
                      {v === 'edit' ? 'Tulis' : 'Pratinjau'}
                    </button>
                  ))}
                </div>
                {view === 'edit' && (
                  <div className="flex flex-wrap items-center">
                    <Tool label="Tebal (Ctrl+B)" onClick={bold}>
                      <Bold />
                    </Tool>
                    <Tool label="Miring (Ctrl+I)" onClick={italic}>
                      <Italic />
                    </Tool>
                    <Tool label="Judul" onClick={() => prefix('## ')}>
                      <Heading2 />
                    </Tool>
                    <Tool label="Daftar" onClick={() => prefix('- ')}>
                      <List />
                    </Tool>
                    <Tool label="Daftar bernomor" onClick={() => prefix('1. ')}>
                      <ListOrdered />
                    </Tool>
                    <Tool label="Checklist" onClick={() => prefix('- [ ] ')}>
                      <ListChecks />
                    </Tool>
                    <Tool label="Tautan (Ctrl+K)" onClick={link}>
                      <Link2 />
                    </Tool>
                    <Tool label="Kode" onClick={code}>
                      <Code />
                    </Tool>
                    <Tool label="Kutipan" onClick={() => prefix('> ')}>
                      <Quote />
                    </Tool>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">
                    {saving ? 'Menyimpan…' : 'Tersimpan'}
                  </span>
                  <Tool
                    label={current.pinned ? 'Lepas sematan' : 'Sematkan di atas'}
                    active={current.pinned}
                    onClick={() => update(current.id, { pinned: !current.pinned }, { touch: false })}
                  >
                    {current.pinned ? <PinOff /> : <Pin />}
                  </Tool>
                  <Tool
                    label="Unduh sebagai .md"
                    onClick={() =>
                      downloadBlob(
                        new Blob([noteAsMarkdown(current)], { type: 'text/markdown' }),
                        `${safeFileName(displayTitle(current))}.md`,
                      )
                    }
                  >
                    <Download />
                  </Tool>
                  {confirming ? (
                    <span className="flex items-center gap-1 text-xs">
                      Hapus?
                      <Button size="sm" variant="destructive" onClick={remove}>
                        Hapus
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                        Batal
                      </Button>
                    </span>
                  ) : (
                    <Tool label="Hapus catatan" onClick={() => setConfirming(true)}>
                      <Trash2 />
                    </Tool>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 pt-4 sm:px-6">
                <input
                  ref={titleRef}
                  value={current.title}
                  onChange={(e) => update(current.id, { title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setView('edit')
                      requestAnimationFrame(() => bodyRef.current?.focus())
                    }
                  }}
                  placeholder="Judul"
                  aria-label="Judul catatan"
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
                />
                <div className="flex shrink-0 items-center gap-1" role="radiogroup" aria-label="Warna">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={current.color === c.id}
                      aria-label={c.label}
                      title={c.label}
                      onClick={() => update(current.id, { color: c.id }, { touch: false })}
                      className={cn(
                        'size-4 rounded-full border',
                        current.color === c.id && 'ring-2 ring-brand-2 ring-offset-1 ring-offset-card',
                      )}
                      style={{ background: c.id === 'none' ? undefined : c.swatch }}
                    />
                  ))}
                </div>
              </div>
              <p className="px-5 pt-1 text-xs text-muted-foreground sm:px-6">
                Diubah {dateText(current.updatedAt)} · dibuat {dateText(current.createdAt)}
              </p>

              {view === 'edit' ? (
                <textarea
                  ref={bodyRef}
                  value={current.body}
                  onChange={(e) => update(current.id, { body: e.target.value })}
                  onKeyDown={(e) => {
                    const mod = e.ctrlKey || e.metaKey
                    if (mod && e.key.toLowerCase() === 'b') {
                      e.preventDefault()
                      bold()
                    } else if (mod && e.key.toLowerCase() === 'i') {
                      e.preventDefault()
                      italic()
                    } else if (mod && e.key.toLowerCase() === 'k') {
                      e.preventDefault()
                      link()
                    } else if (e.key === 'Enter' && !e.shiftKey && !mod) {
                      const el = e.currentTarget
                      if (el.selectionStart !== el.selectionEnd) return
                      const r = continueList(current.body, el.selectionStart)
                      if (!r) return
                      e.preventDefault()
                      update(current.id, { body: r.text })
                      requestAnimationFrame(() => el.setSelectionRange(r.cursor, r.cursor))
                    }
                  }}
                  placeholder="Tulis sesuatu… (Markdown didukung: **tebal**, - daftar, - [ ] checklist)"
                  aria-label="Isi catatan"
                  className="min-h-[50vh] flex-1 resize-none bg-transparent px-5 py-4 font-mono text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/50 sm:px-6"
                />
              ) : (
                <div
                  ref={previewRef}
                  onClick={(e) => {
                    const box = e.target as HTMLElement
                    if (box instanceof HTMLInputElement && box.dataset.task) {
                      e.preventDefault()
                      update(current.id, { body: toggleTask(current.body, Number(box.dataset.task)) })
                    }
                  }}
                  className={cn(
                    'min-h-[50vh] flex-1 overflow-y-auto px-5 py-4 leading-relaxed sm:px-6',
                    '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold',
                    '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5',
                    '[&_li:has(>input)]:-ml-6 [&_li:has(>input)]:list-none [&_input]:mr-2 [&_input]:size-4 [&_input]:translate-y-0.5 [&_input]:cursor-pointer [&_input]:accent-brand-2',
                    '[&_a]:text-brand-2 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
                    '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
                    '[&_hr]:my-4 [&_table]:my-3 [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1',
                  )}
                  // Sanitized with DOMPurify in renderMarkdown().
                  dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:.5">Catatan ini masih kosong.</p>' }}
                />
              )}
            </>
          )}
        </section>
      </div>

      {error && <ErrorNote message={error} />}
      <p className="text-xs text-muted-foreground">
        Catatan tersimpan otomatis di browser ini saja — tidak dikirim ke mana pun dan tidak tersinkron ke perangkat
        lain. Pakai <b>Cadangkan</b> untuk menyimpan semua catatan ke file, dan <b>Pulihkan</b> untuk membukanya di
        perangkat lain.
      </p>
    </div>
  )
}

function Tool({
  label,
  onClick,
  active,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded-lg transition-colors [&_svg]:size-4',
        active ? 'bg-accent text-brand-2' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
