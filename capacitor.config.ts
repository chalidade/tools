import type { CapacitorConfig } from '@capacitor/cli'

/*
 * The iOS app (App Store): the same site, built with `npm run build:ios` and
 * bundled inside the app, so every tool works offline and nothing is loaded
 * from toowl.my.id. See docs/IOS.md for build, signing and submission.
 */
const config: CapacitorConfig = {
  appId: 'id.my.toowl',
  appName: 'toowl',
  webDir: 'dist',
  ios: {
    // Pages already pad themselves with env(safe-area-inset-*) (viewport-fit=cover).
    contentInset: 'never',
    backgroundColor: '#09090a',
    // Long-press link previews make no sense for app buttons.
    allowsLinkPreview: false,
  },
}

export default config
