import { cn } from '@/lib/utils'

/** The owl and the toowl wordmark. The text follows the theme and font size. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight select-none', className)}>
      <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width={26} height={26} className="size-[1.45em]" />
      toowl
    </span>
  )
}
