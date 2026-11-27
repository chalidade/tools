// scripts/indexnow.mjs — after a deploy, tells search engines that support
// IndexNow (Bing, Yandex, Seznam, Naver…) about every page in dist/sitemap.xml,
// so new and changed tools are crawled within hours instead of weeks. Google
// does not use IndexNow; it reads the sitemap submitted in Search Console.
//
// The key is public by design: engines fetch https://toowl.my.id/<key>.txt to
// check that this site sent the list. Only page addresses are sent.
//
//   node scripts/indexnow.mjs   (CI, after deploy-pages)

import { readFileSync } from 'node:fs'

const KEY = 'c093326b90020735a36feacdbe62f548'
const HOST = 'toowl.my.id'

const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (!urlList.length) throw new Error('indexnow: no <loc> in dist/sitemap.xml')

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
})
// 200 = accepted, 202 = accepted, key not checked yet. Anything else is logged, never fatal.
console.log(`indexnow: ${urlList.length} URLs → HTTP ${res.status} ${await res.text()}`)
