// Minimal, safe offline Markdown renderer (CommonMark-ish subset).
// Raw HTML in the source is escaped. Links only http/https/mailto/relative-anchor.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeUrl(url: string): string | null {
  const u = url.trim()
  if (/^(https?:|mailto:)/i.test(u)) return u
  if (u.startsWith('#') || u.startsWith('/') || u.startsWith('./') || u.startsWith('../')) return u
  return null // javascript:, data:, etc. rejected
}

function inline(s: string): string {
  let out = escapeHtml(s)
  // inline code first so its contents are not further processed
  const codes: string[] = []
  out = out.replace(/`([^`]+)`/g, (_m, c1: string) => {
    codes.push(c1)
    return `\u0000${codes.length - 1}\u0000`
  })
  // images ![alt](url)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
    const safe = sanitizeUrl(url)
    return safe ? `<img alt="${alt}" src="${safe}" loading="lazy">` : escapeHtml(alt)
  })
  // links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const safe = sanitizeUrl(url)
    return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>` : text
  })
  // bold / italic / strike
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  out = out.replace(/_([^_\n]+)_/g, '<em>$1</em>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  // restore inline code
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<code>${codes[Number(i)]}</code>`)
  return out
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let inList: 'ul' | 'ol' | null = null
  const closeList = () => { if (inList) { out.push(`</${inList}>`); inList = null } }

  while (i < lines.length) {
    const line = lines[i]

    // fenced code blocks
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      closeList()
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++ }
      i++ // skip closing fence
      const lang = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : ''
      out.push(`<pre><code${lang}>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }

    if (/^\s*$/.test(line)) { closeList(); i++; continue }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue }

    // hr
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { closeList(); out.push('<hr>'); i++; continue }

    // blockquote (single-level)
    const bq = line.match(/^>\s?(.*)$/)
    if (bq) { closeList(); out.push(`<blockquote><p>${inline(bq[1])}</p></blockquote>`); i++; continue }

    // lists
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol'
      if (inList !== kind) { closeList(); out.push(`<${kind}>`); inList = kind }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`)
      i++
      continue
    }

    closeList()
    // paragraph: gather until blank line or block start
    const buf: string[] = [line]
    i++
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|---)/.test(lines[i])) {
      buf.push(lines[i]); i++
    }
    out.push(`<p>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</p>`)
  }
  closeList()
  return out.join('\n')
}
