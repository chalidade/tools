import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** "Salin" button that flips to "Tersalin" for a moment after copying `text`. */
export function CopyButton({
  text,
  label = 'Salin',
  variant = 'ghost',
  disabled,
}: {
  text: string
  label?: string
  variant?: 'ghost' | 'outline'
  disabled?: boolean
}) {
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
      {copied ? 'Tersalin' : label}
    </Button>
  )
}
