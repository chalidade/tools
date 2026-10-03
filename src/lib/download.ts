/** Saves an in-memory file to the visitor's device. Nothing is uploaded. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after the click has been handled, or some browsers cancel the save.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "laporan.docx" → "laporan.pdf" */
export function withExtension(name: string, ext: string) {
  return name.replace(/\.[^.]+$/, '') + ext
}
