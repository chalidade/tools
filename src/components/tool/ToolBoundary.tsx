import { Component, type ReactNode } from 'react'
import { RotateCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { tr } from '@/lib/i18n'

/*
 * A tool's code is a separate chunk loaded on demand. It can fail to arrive:
 * offline before the tool was ever opened (the app only keeps what it has
 * used), or in a tab left open across a deploy. Show why instead of letting
 * the whole page go blank.
 */
export class ToolBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    const offline = !navigator.onLine
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-6 text-sm">
        {offline && <WifiOff className="size-5 text-muted-foreground" />}
        <p className="font-medium">
          {offline
            ? tr('Tool ini belum tersimpan untuk dipakai offline.', "This tool hasn't been saved for offline use yet.")
            : tr('Tool ini gagal dimuat.', "This tool couldn't be loaded.")}
        </p>
        <p className="text-muted-foreground">
          {offline
            ? tr(
                'Buka sekali saat ada internet — setelah itu tool ini tetap bisa dipakai tanpa koneksi.',
                'Open it once while online — after that it keeps working without a connection.',
              )
            : tr('Mungkin ada versi baru situs. Muat ulang halaman untuk mengambilnya.', 'There may be a newer version of the site. Reload to get it.')}
        </p>
        <Button variant="outline" onClick={() => location.reload()}>
          <RotateCw /> {tr('Muat ulang', 'Reload')}
        </Button>
      </div>
    )
  }
}
