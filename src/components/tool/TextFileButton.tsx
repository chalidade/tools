import { FileUp } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** A small "Open file" button for text tools: reads the chosen file as text on the device. */
export function TextFileButton({ accept, onText }: { accept: string; onText: (text: string, name: string) => void }) {
  const t = useT()
  return (
    <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}>
      <FileUp />
      {t('Buka file', 'Open file')}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void file.text().then((text) => onText(text, file.name))
        }}
      />
    </label>
  )
}
