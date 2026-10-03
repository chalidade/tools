import { cn } from '@/lib/utils'

/** The "Tools" wordmark. One dark PNG, inverted for dark mode. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Tools"
      width={314}
      height={96}
      className={cn('h-6 w-auto select-none dark:invert', className)}
      draggable={false}
    />
  )
}
