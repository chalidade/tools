import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

function formatSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** "Before → after, −X%" card shared by the compression tools. */
export function SizeResult({ before, after, children }: { before: number; after: number; children?: ReactNode }) {
  const saved = 1 - after / before
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
        <div>
          <p className="text-xs text-muted-foreground">Sebelum</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{formatSize(before)}</p>
        </div>
        <ArrowRight className="hidden size-5 text-muted-foreground sm:block" />
        <div>
          <p className="text-xs text-muted-foreground">Sesudah</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{formatSize(after)}</p>
        </div>
        <p className="text-gradient text-4xl font-semibold tracking-tight sm:text-right">
          {saved > 0.005 ? `−${Math.round(saved * 100)}%` : saved < -0.005 ? `+${Math.round(-saved * 100)}%` : '±0%'}
        </p>
      </div>
      <div className="h-2 bg-muted">
        <div
          className="h-full bg-gradient-brand"
          style={{ width: `${Math.min(100, Math.max(2, (after / before) * 100))}%` }}
        />
      </div>
      {children && (
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">{children}</div>
      )}
    </div>
  )
}

/** Progress bar with percentage and time left, plus a cancel button slot. */
export function ProgressCard({
  label,
  progress,
  startedAt,
  action,
}: {
  label: string
  progress: number
  startedAt: number
  action?: ReactNode
}) {
  const elapsed = (Date.now() - startedAt) / 1000
  const left = progress > 0.02 ? (elapsed / progress) * (1 - progress) : null
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">
          {Math.round(progress * 100)}%
          {left !== null &&
            ` · sisa ~${left < 60 ? `${Math.max(1, Math.round(left))} dtk` : `${Math.round(left / 60)} mnt`}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-brand transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {action}
    </div>
  )
}
