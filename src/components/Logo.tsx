import { cn } from '@/lib/utils'

/** The toowl mark (the owl) and wordmark. Sized by font size, so `text-base` makes it smaller. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-[0.4em] text-xl font-semibold tracking-tight select-none', className)}>
      <img src={`${import.meta.env.BASE_URL}owl.png`} alt="" width={107} height={128} className="h-[1.6em] w-auto" draggable={false} />
      toowl
    </span>
  )
}
