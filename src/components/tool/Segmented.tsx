import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string | number> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}

/** A small labelled pill switch for picking one option, e.g. a page size. */
export function Segmented<T extends string | number>({ label, value, options, onChange, disabled }: SegmentedProps<T>) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border bg-muted/60 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50',
              o.value === value
                ? 'bg-background font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
