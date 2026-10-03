import { Wrench } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Wrench className="size-4" />
          </span>
          tools
        </a>
        <a
          href="https://github.com/chalidade/tools"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          GitHub
        </a>
      </div>
    </header>
  )
}
