import { cn } from '@/lib/utils'

/** The toowl wordmark: plain text, so it follows the theme and font size. */
export function Logo({ className }: { className?: string }) {
  return <span className={cn('shrink-0 text-xl font-semibold tracking-tight select-none', className)}>toowl</span>
}
