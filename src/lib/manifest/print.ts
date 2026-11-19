/**
 * Browser fallback for print jobs (QZ Tray not running): prints a complete HTML document
 * through a hidden iframe, so only the document is printed — not the counter screen.
 */
export function printDocument(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'
  document.body.appendChild(frame)

  const doc = frame.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => setTimeout(() => frame.remove(), 500)
  frame.contentWindow!.onafterprint = cleanup
  // let fonts / images lay out first
  setTimeout(() => {
    frame.contentWindow!.focus()
    frame.contentWindow!.print()
    setTimeout(cleanup, 60_000)
  }, 300)
}

/** Several documents in one browser print job — each one starts on a new page */
export function joinDocuments(documents: string[]) {
  if (documents.length === 1) return documents[0]
  const bodies = documents.map((d) => d.slice(d.indexOf('<body>') + 6, d.lastIndexOf('</body>')))
  const head = documents[0].slice(0, documents[0].indexOf('<body>'))
  return `${head}<body>${bodies.map((b) => `<div style="page-break-after:always">${b}</div>`).join('')}</body></html>`
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
