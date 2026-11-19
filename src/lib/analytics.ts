// Visitor counts for toowl.my.id with Cloudflare Web Analytics: no cookies,
// no stored IP, no ID that follows a visitor. The beacon sends the page
// address, referrer, browser/device type and load timing — never a file or
// anything typed into a tool. `spa: true` counts in-app navigations
// (pushState) as page views.
//
// It runs only on the real site: not in dev, not inside an embed on someone
// else's page, and not in the iOS build (Capacitor serves the bundle from
// capacitor://localhost). The Android app (TWA) is the site itself, so it
// counts. public/privacy/index.html describes this — keep the two in step.

/** The site token from Cloudflare → Web Analytics → toowl.my.id. Public by design. */
const TOKEN = ''
const HOST = 'toowl.my.id'

export function startAnalytics(embed: boolean) {
  if (!TOKEN || !import.meta.env.PROD || embed || location.hostname !== HOST) return
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.dataset.cfBeacon = JSON.stringify({ token: TOKEN, spa: true })
  document.head.appendChild(s)
}
