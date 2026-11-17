import { useState, type DragEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

interface FileDropProps {
  /** Passed straight to the input's `accept`. */
  accept: string
  /** Shown when idle, e.g. "Tarik file .pdf ke sini". */
  label: string
  /** When set, the drop zone shows a spinner with this text and ignores input. */
  busyLabel?: string
  /** Accept several files at once; `onFiles` then receives all of them. */
  multiple?: boolean
  onFiles: (files: File[]) => void
}

/** Drag-and-drop or click-to-pick zone for one or more files. Reads nothing itself. */
export function FileDrop({ accept, label, busyLabel, multiple = false, onFiles }: FileDropProps) {
  const t = useT()
  const [dragging, setDragging] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) onFiles(multiple ? dropped : dropped.slice(0, 1))
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed border-input bg-card px-6 py-12 text-center transition-[border-color,background-color] duration-200 sm:py-16',
        dragging
          ? 'border-brand-2 bg-[color-mix(in_oklab,var(--brand-2)_9%,var(--card))]'
          : 'hover:border-brand-2/50 hover:bg-[color-mix(in_oklab,var(--brand-2)_4%,var(--card))]',
        busyLabel && 'pointer-events-none',
      )}
    >
      <span
        className={cn(
          'grid size-12 place-items-center rounded-xl bg-gradient-brand text-white shadow-sm transition-transform duration-200 ease-out',
          dragging ? '-translate-y-1 scale-110' : 'group-hover:-translate-y-0.5',
        )}
      >
        {busyLabel ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
      </span>
      <p className="mt-4 text-base font-medium tracking-tight sm:text-lg">{busyLabel ?? label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {busyLabel
          ? t('Diproses di perangkatmu…', 'Processing on your device…')
          : t('atau klik untuk memilih dari perangkat', 'or click to choose from your device')}
      </p>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          // Clear so picking the same file again still fires onChange.
          e.target.value = ''
          if (picked.length) onFiles(picked)
        }}
      />
    </label>
  )
}
