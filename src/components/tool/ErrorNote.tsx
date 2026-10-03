import { AlertCircle } from 'lucide-react'

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p>{message}</p>
    </div>
  )
}
