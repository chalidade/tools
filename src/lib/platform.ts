// Is this page running inside the toowl Android app (the Play Store TWA)?
//
// Chrome opens a Trusted Web Activity with the referrer
// "android-app://<package>/", but only on the first page; later loads in the
// same tab (reloads, a link that is a real page load) lose it. The answer is
// kept in sessionStorage, which is per tab: the app's tab keeps it, while the
// Chrome browser (which shares localStorage with the app) never sees it.
const PACKAGE = 'id.my.toowl'
const KEY = 'toowl:play-app'

let cached: boolean | undefined

export function isPlayApp(): boolean {
  if (cached !== undefined) return cached
  if (typeof document === 'undefined') return (cached = false)
  let yes = document.referrer.startsWith(`android-app://${PACKAGE}`)
  try {
    if (yes) sessionStorage.setItem(KEY, '1')
    else yes = sessionStorage.getItem(KEY) === '1'
  } catch {
    // Storage blocked: go by the referrer alone.
  }
  return (cached = yes)
}
