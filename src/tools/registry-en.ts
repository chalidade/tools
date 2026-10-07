// English names and descriptions for the registry. The Indonesian text lives
// in registry.ts next to each tool; read either through toolText() /
// categoryText() there. Keywords here are added to search in both languages.

import type { CategoryId } from './registry'

export const CATEGORIES_EN: Record<CategoryId, { title: string; description: string }> = {
  'to-pdf': { title: 'To PDF', description: 'Documents, slides, spreadsheets and images to PDF.' },
  'from-pdf': { title: 'From PDF', description: 'Get a PDF into Word, Excel, PowerPoint, images or Markdown.' },
  pdf: { title: 'Edit & Secure PDF', description: 'Merge, split, watermark, sign, compress, lock and unlock PDFs.' },
  media: {
    title: 'Images & Media',
    description: 'Edit and shrink photos, video and audio: trim, speed up, merge, GIF and more.',
  },
  dev: { title: 'Developer & Design', description: 'QR codes, favicons, Base64, colors and tidy data.' },
  productivity: { title: 'Productivity', description: 'Take notes, calculate and sketch.' },
}

export const TOOLS_EN: Record<string, { title: string; description: string; formats?: string; keywords?: string[] }> = {
  'doc-to-pdf': { title: 'Word to PDF', description: 'Turn a Word document (.docx) into a PDF and download it.', keywords: ['convert', 'document', 'letter', 'resume'] },
  'pdf-to-word': { title: 'PDF to Word', description: 'Get the text of a PDF into an editable Word document (.docx).', keywords: ['convert', 'edit', 'document'] },
  'image-to-pdf': {
    title: 'Images to PDF',
    description: 'Combine photos and images into one PDF — reorder, rotate and pick a paper size.',
    keywords: ['photo', 'picture', 'scan', 'combine'],
  },
  'ppt-to-pdf': { title: 'PowerPoint to PDF', description: 'Turn a PowerPoint deck (.pptx) into a PDF, one page per slide.', keywords: ['slides', 'presentation', 'deck'] },
  'excel-to-pdf': {
    title: 'Excel to PDF',
    description: 'Turn an Excel spreadsheet (.xlsx) or CSV into a tidy PDF table, colors and number formats included.',
    keywords: ['spreadsheet', 'table', 'sheet'],
  },
  'pdf-to-excel': { title: 'PDF to Excel', description: 'Pull tables out of a PDF into an Excel spreadsheet (.xlsx) — numbers ready to calculate.', keywords: ['table', 'spreadsheet', 'extract'] },
  'pdf-to-ppt': { title: 'PDF to PowerPoint', description: 'Turn each PDF page into a PowerPoint slide (.pptx) — the text stays editable.', keywords: ['slides', 'presentation'] },
  'pdf-to-image': { title: 'PDF to Images', description: 'Save PDF pages as PNG or JPG images, up to 300 dpi.', keywords: ['picture', 'photo', 'png', 'jpg'] },
  'merge-pdf': { title: 'Merge PDF', description: 'Combine several PDFs into one file — drag to set the order.', keywords: ['combine', 'join'] },
  'split-pdf': { title: 'Split PDF', description: 'Take certain pages, split by range, or break every N pages into separate PDFs.', keywords: ['extract', 'pages', 'separate'] },
  'watermark-pdf': { title: 'Watermark PDF', description: 'Put a translucent text or logo on every page — centred or tiled.', keywords: ['stamp', 'logo', 'confidential'] },
  'sign-pdf': { title: 'Sign PDF', description: 'Draw or upload your signature, then place it on any page.', formats: 'PDF → PDF + signature', keywords: ['signature', 'sign'] },
  'compress-pdf': { title: 'Compress PDF', description: 'Shrink a PDF by downsizing the photos inside — text stays sharp.', keywords: ['shrink', 'reduce', 'smaller'] },
  'pdf-to-markdown': { title: 'PDF to Markdown', description: 'Turn a PDF into Markdown: headings, bold/italic, lists and tables.', keywords: ['text', 'notes'] },
  'protect-pdf': { title: 'Protect PDF', description: 'Lock a PDF with a password (AES-256) and restrict printing, copying or editing.', keywords: ['lock', 'encrypt', 'password'] },
  'unlock-pdf': { title: 'Unlock PDF', description: 'Remove the password or restrictions from your own PDF.', keywords: ['unlock', 'decrypt', 'remove password'] },
  notes: {
    title: 'Notes',
    description: 'Write notes with Markdown and checklists — saved automatically in your browser, with file backup.',
    formats: 'Text → Markdown',
    keywords: ['note', 'memo', 'todo', 'checklist', 'journal'],
  },
  calculator: {
    title: 'Calculator',
    description: 'Basic and scientific calculator — percentages, powers, roots, trigonometry, with history.',
    formats: 'Expression → Result',
    keywords: ['calculate', 'math', 'scientific', 'percent'],
  },
  whiteboard: {
    title: 'Whiteboard',
    description: 'A whiteboard or blackboard to write and draw on freely — pen, highlighter, shapes, text, many pages.',
    formats: 'Handwriting → PNG / PDF',
    keywords: ['draw', 'sketch', 'paint', 'board', 'teach'],
  },
  'compress-video': { title: 'Compress Video', description: "Shrink a video with your device's own encoder — fast, and nothing is uploaded.", keywords: ['shrink', 'reduce', 'smaller'] },
  'crop-resize-image': { title: 'Crop & Resize Image', description: 'Crop freely or to 1:1, 16:9, 4:5; rotate, flip and resize in pixels.', keywords: ['crop', 'resize', 'rotate'] },
  'remove-background': {
    title: 'Remove Background',
    description: 'Remove a background with a magic wand, color select, lasso or brush — then make it transparent or recolor it.',
    keywords: ['background', 'transparent', 'cut out'],
  },
  'compress-image': { title: 'Compress Images', description: 'Shrink many photos at once — JPG or WebP, with GPS metadata stripped.', keywords: ['shrink', 'photo', 'reduce'] },
  'trim-media': { title: 'Trim Video & Audio', description: 'Cut out part of a video or song by dragging the start/end markers — same format and quality.', keywords: ['cut', 'trim', 'clip'] },
  'gif-mp4': { title: 'GIF ⇄ MP4', description: 'Turn a GIF into a much smaller MP4 video, or a video clip into a GIF.', keywords: ['animation', 'gif'] },
  'extract-frames': { title: 'Extract Video Frames', description: 'Grab video frames as full-resolution images — one by one or every N seconds.', keywords: ['screenshot', 'frame', 'still'] },
  'change-speed': { title: 'Change Speed', description: 'Speed up or slow down video and audio (0.25×–4×) while keeping the pitch natural.', keywords: ['speed', 'slow motion', 'fast'] },
  'merge-audio': { title: 'Merge Audio', description: 'Join several audio files into one — mixed formats welcome; set the order and gaps.', keywords: ['join', 'combine'] },
  'screen-recorder': {
    title: 'Screen Recorder',
    description: 'Record your screen, a window or a tab — with microphone and tab sound, plus a floating camera. Download WebM or MP4.',
    formats: 'Screen → WebM / MP4',
    keywords: ['record', 'screen', 'capture', 'tutorial'],
  },
  'audio-recorder': {
    title: 'Voice Recorder',
    description: 'Record from your microphone — pause, resume, play back, then download as MP3, M4A or WAV.',
    formats: 'Microphone → MP3 / M4A / WAV',
    keywords: ['record', 'voice', 'microphone', 'memo'],
  },
  'compress-audio': { title: 'Compress Audio', description: 'Shrink audio to MP3, AAC or Opus — or pull the sound out of a video.', keywords: ['shrink', 'mp3', 'reduce'] },
  'qr-generator': {
    title: 'QR Code Generator',
    description: 'Make QR codes for links, text, Wi-Fi, WhatsApp, contacts or email — with a logo and colors.',
    formats: 'Text → PNG / SVG',
    keywords: ['qr', 'barcode', 'generate'],
  },
  'qr-reader': {
    title: 'QR & Barcode Reader',
    description: 'Scan QR codes or barcodes from an image, screenshot or camera — Wi-Fi, contacts and links shown neatly.',
    formats: 'Image / Camera → Text',
    keywords: ['scan', 'qr', 'barcode', 'read'],
  },
  'json-beautify': { title: 'JSON Beautifier', description: 'Format JSON with indentation, sort keys, and find syntax errors with their position.', formats: 'JSON → pretty JSON', keywords: ['format', 'pretty'] },
  'json-minify': { title: 'JSON Minify', description: 'Squeeze JSON onto one line with no spaces — numbers and text untouched.', formats: 'JSON → compact JSON', keywords: ['compress', 'compact'] },
  'favicon-generator': {
    title: 'Favicon Generator',
    description: 'Make favicon.ico, iOS & Android icons and a web manifest from a logo, letter or emoji.',
    formats: 'PNG / SVG / text → ICO + PNG',
    keywords: ['icon', 'favicon', 'website'],
  },
  'image-to-base64': {
    title: 'Image ⇄ Base64',
    description: 'Turn an image into Base64 / a data URL ready for HTML, CSS or Markdown — and back.',
    formats: 'Image ⇄ Base64',
    keywords: ['encode', 'data url'],
  },
  'color-picker': {
    title: 'Color Picker',
    description: 'Pick colors from an image or the screen, convert to HEX/RGB/HSL/OKLCH, check contrast and build shades.',
    keywords: ['color', 'color', 'palette', 'contrast'],
  },
}
