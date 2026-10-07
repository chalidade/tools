import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

interface PasswordInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  invalid?: boolean
  /** "new-password" when setting one, "current-password" when entering one. */
  autoComplete: 'new-password' | 'current-password'
  onEnter?: () => void
}

/** A labelled password field with a show/hide toggle. */
export function PasswordInput({ label, value, onChange, placeholder, autoFocus, invalid, autoComplete, onEnter }: PasswordInputProps) {
  const t = useT()
  const [visible, setVisible] = useState(false)
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          'flex items-center rounded-xl border bg-background pr-1 transition-colors focus-within:border-brand-2/60',
          invalid && 'border-destructive/60',
        )}
      >
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter?.()
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          spellCheck={false}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('Sembunyikan password', 'Hide password') : t('Tampilkan password', 'Show password')}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  )
}
