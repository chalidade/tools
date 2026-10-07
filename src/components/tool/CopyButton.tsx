import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

/** "Copy" button that flips to "Copied" for a moment after copying `text`. */
export function CopyButton({
  text,
  label,
  variant = 'ghost',
  disabled,
}: {
  text: string
  label?: string
  variant?: 'ghost' | 'outline'
  disabled?: boolean
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: the text stays selectable on the page.
    }
  }

  return (
    <Button variant={variant} size="sm" disabled={disabled || !text} onClick={() => void copy()}>
      {copied ? <Check /> : <Copy />}
      {copied ? t('Tersalin', 'Copied') : (label ?? t('Salin', 'Copy'))}
    </Button>
  )
}
