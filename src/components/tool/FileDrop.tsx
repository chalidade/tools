import { useState, type DragEvent } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropProps {
  /** Passed straight to the input's `accept`. */
  accept: string
  /** Shown when idle, e.g. "Tarik file .pdf ke sini". */
  label: string
  /** When set, the drop zone shows a spinner with this text and ignores input. */
  busyLabel?: string
  onFile: (file: File) => void
}

/** Drag-and-drop or click-to-pick zone for a single file. Reads nothing itself. */
export function FileDrop({ accept, label, busyLabel, onFile }: FileDropProps) {
  const [dragging, setDragging] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
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
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-16 text-center transition-colors',
        dragging ? 'border-primary bg-accent' : 'hover:border-primary/40',
        busyLabel && 'pointer-events-none opacity-70',
      )}
    >
      {busyLabel ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      ) : (
        <FileUp className="size-8 text-muted-foreground" />
      )}
      <p className="mt-4 font-medium">{busyLabel ?? label}</p>
      <p className="mt-1 text-sm text-muted-foreground">atau klik untuk memilih dari perangkat</p>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          // Clear so picking the same file again still fires onChange.
          e.target.value = ''
          if (picked) onFile(picked)
        }}
      />
    </label>
  )
}
