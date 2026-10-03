import { useState, type DragEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed bg-card px-6 py-16 text-center transition-all sm:py-20',
        dragging ? 'scale-[1.01] border-brand-2/60' : 'hover:border-brand-2/40',
        busyLabel && 'pointer-events-none',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'bg-glow pointer-events-none absolute inset-0 transition-opacity duration-300',
          dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
        )}
      />
      <span className="relative grid size-14 place-items-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-brand-2/25 transition-transform group-hover:-translate-y-0.5">
        {busyLabel ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
      </span>
      <p className="relative mt-5 text-lg font-medium tracking-tight">{busyLabel ?? label}</p>
      <p className="relative mt-1 text-sm text-muted-foreground">
        {busyLabel ? 'Diproses di perangkatmu…' : 'atau klik untuk memilih dari perangkat'}
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
