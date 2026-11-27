// Service worker: the toolbar button opens the side panel, and right-click
// menus hand a page, link, text or image to a tool there. The job is parked in
// chrome.storage.session; the side panel picks it up (app/pending.ts).

export interface Job {
  tool: string
  /** QR generator: what to encode. */
  qr?: { kind: 'url' | 'text'; value: string }
  /** Image tools: the picture right-clicked. */
  imageUrl?: string
  pageUrl?: string
  at: number
}

const MENUS: { id: string; title: string; contexts: [`${chrome.contextMenus.ContextType}`] }[] = [
  { id: 'qr-page', title: 'QR code for this page', contexts: ['page'] },
  { id: 'qr-link', title: 'QR code for this link', contexts: ['link'] },
  { id: 'qr-text', title: 'QR code for "%s"', contexts: ['selection'] },
  { id: 'compress-image', title: 'Compress this image', contexts: ['image'] },
  { id: 'convert-image', title: 'Convert this image (JPG / PNG / WebP)', contexts: ['image'] },
  { id: 'remove-background', title: 'Remove background (Pro)', contexts: ['image'] },
  { id: 'qr-reader', title: 'Read QR code in this image', contexts: ['image'] },
]

chrome.runtime.onInstalled.addListener((details) => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'toowl', title: 'toowl', contexts: ['page', 'link', 'selection', 'image'] })
    for (const m of MENUS) chrome.contextMenus.create({ ...m, parentId: 'toowl' })
  })
  if (details.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html?welcome') })
})

chrome.runtime.onStartup.addListener(() => void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }))

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId)
  let job: Job | undefined
  if (id === 'qr-page' && info.pageUrl) job = { tool: 'qr-generator', qr: { kind: 'url', value: info.pageUrl }, at: Date.now() }
  else if (id === 'qr-link' && info.linkUrl) job = { tool: 'qr-generator', qr: { kind: 'url', value: info.linkUrl }, at: Date.now() }
  else if (id === 'qr-text' && info.selectionText) job = { tool: 'qr-generator', qr: { kind: 'text', value: info.selectionText }, at: Date.now() }
  else if (info.srcUrl) job = { tool: id, imageUrl: info.srcUrl, pageUrl: info.pageUrl, at: Date.now() }
  if (!job) return
  // Open first: sidePanel.open must run inside the click's user gesture.
  if (tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {})
  void chrome.storage.session.set({ job })
})
