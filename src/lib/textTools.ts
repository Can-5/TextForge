// TextForge — all tools as pure, testable functions.
// No network access anywhere in this file.

export type ToolCategory =
  | 'Format' | 'Encode / Decode' | 'Lines' | 'Text' | 'Crypto' | 'Dev'

export interface OptionDef {
  key: string
  label: string
  type: 'select' | 'checkbox'
  options?: { value: string; label: string }[]
  default: string | boolean
}

export interface TransformDef {
  kind: 'transform'
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string // SVG path data, 24x24 stroke icon
  keywords: string[]
  options: OptionDef[]
  run: (input: string, opts: Record<string, string | boolean>) => string | Promise<string>
}

export interface SpecialDef {
  kind: 'diff' | 'markdown' | 'count' | 'uuid' | 'regex'
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  keywords: string[]
}

export type ToolDef = TransformDef | SpecialDef

// ─── helpers ──────────────────────────────────────────────────────

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length
}

function toBinString(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return bin
}
function fromBinString(bin: string): string {
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// ─── individual tool logic ─────────────────────────────────────────

export function formatJson(input: string, opts: Record<string, string | boolean>): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const parsed = JSON.parse(trimmed) // throws with message; UI catches
  if (opts.mode === 'minify') return JSON.stringify(parsed)
  const indent = opts.indent === 'tab' ? '\t' : Number(opts.indent ?? 2)
  return JSON.stringify(parsed, null, indent as number | string)
}

export function encodeBase64(input: string): string {
  return btoa(toBinString(input))
}
export function decodeBase64(input: string): string {
  const clean = input.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) {
    throw new Error('Invalid Base64 input')
  }
  return fromBinString(atob(clean))
}

export function encodeUrl(input: string): string { return encodeURIComponent(input) }
export function decodeUrl(input: string): string { return decodeURIComponent(input) }

export function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')      // camelCase boundary
    .replace(/[_\-./]+/g, ' ')                  // separators
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
export function convertCase(input: string, mode: string): string {
  const words = splitWords(input)
  if (!words.length) return ''
  const lower = words.map((w) => w.toLowerCase())
  switch (mode) {
    case 'lower': return lower.join(' ')
    case 'upper': return lower.join(' ').toUpperCase()
    case 'title': return lower.map(cap).join(' ')
    case 'sentence': {
      const s = lower.join(' ')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
    case 'camel': return lower[0] + lower.slice(1).map(cap).join('')
    case 'pascal': return lower.map(cap).join('')
    case 'snake': return lower.join('_')
    case 'kebab': return lower.join('-')
    case 'constant': return lower.join('_').toUpperCase()
    case 'dot': return lower.join('.')
    case 'path': return lower.join('/')
    default: return input
  }
}

export function cleanWhitespace(input: string, opts: Record<string, string | boolean>): string {
  let lines = input.split('\n')
  if (opts.tabsToSpaces) lines = lines.map((l) => l.replace(/\t/g, '  '))
  if (opts.trimLineEnds) lines = lines.map((l) => l.replace(/[ \t]+$/g, ''))
  let out = lines.join('\n')
  if (opts.collapseBlankLines) out = out.replace(/\n{3,}/g, '\n\n')
  if (opts.trimOuter) out = out.replace(/^\n+/, '').replace(/\n+$/, '')
  return out
}

export function dedupeLines(input: string, opts: Record<string, string | boolean>): string {
  const ignoreCase = Boolean(opts.ignoreCase)
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of input.split('\n')) {
    const key = ignoreCase ? line.toLowerCase() : line
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out.join('\n')
}

export function sortLines(input: string, opts: Record<string, string | boolean>): string {
  let lines = input.split('\n')
  if (opts.dropEmpty) lines = lines.filter((l) => l.trim() !== '')
  const ci = Boolean(opts.ignoreCase)
  const numeric = Boolean(opts.numeric)
  const key = (l: string) => (ci ? l.toLowerCase() : l)
  lines = [...lines].sort((a, b) => {
    if (numeric) {
      const na = parseFloat(a), nb = parseFloat(b)
      const xa = Number.isNaN(na) ? Number.POSITIVE_INFINITY : na
      const xb = Number.isNaN(nb) ? Number.POSITIVE_INFINITY : nb
      return xa - xb
    }
    return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0
  })
  if (opts.order === 'desc') lines.reverse()
  return lines.join('\n')
}

// HTML entities — named map for common entities + numeric support
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  larr: '←', uarr: '↑', rarr: '→', darr: '↓', bull: '•', middot: '·',
}
export function encodeHtmlEntities(input: string, opts: Record<string, string | boolean>): string {
  let out = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  if (opts.all) out = Array.from(out).map((ch) => {
    const cp = ch.codePointAt(0)!
    return cp > 127 ? `&#${cp};` : ch
  }).join('')
  return out
}
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const cp = parseInt(body.slice(2), 16)
      return Number.isNaN(cp) ? m : String.fromCodePoint(cp)
    }
    if (body.startsWith('#')) {
      const cp = parseInt(body.slice(1), 10)
      return Number.isNaN(cp) ? m : String.fromCodePoint(cp)
    }
    return NAMED[body] ?? m
  })
}

export async function hashText(input: string, algo: string): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateUuids(count: number, opts: Record<string, string | boolean>): string {
  const n = Math.min(Math.max(1, count), 100)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    let u = crypto.randomUUID()
    if (opts.noHyphens) u = u.replace(/-/g, '')
    if (opts.uppercase) u = u.toUpperCase()
    out.push(u)
  }
  return out.join('\n')
}

export interface CountResult {
  words: number
  chars: number
  charsNoSpaces: number
  lines: number
  paragraphs: number
  bytes: number
  readingTimeMin: number
}
export function countText(input: string): CountResult {
  const words = input.trim() ? input.trim().split(/\s+/).length : 0
  const paragraphs = input.trim() ? input.trim().split(/\n\s*\n/).filter((p) => p.trim()).length : 0
  const lines = input === '' ? 0 : input.split('\n').length
  return {
    words,
    chars: [...input].length,
    charsNoSpaces: [...input.replace(/\s/g, '')].length,
    lines,
    paragraphs,
    bytes: utf8Bytes(input),
    readingTimeMin: words / 200,
  }
}

// ─── line diff (LCS with common prefix/suffix trimming) ──────────

export type DiffLine = { type: 'same' | 'add' | 'del'; text: string }

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  // common prefix
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  // common suffix
  let endA = a.length, endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB-- }

  const midA = a.slice(start, endA)
  const midB = b.slice(start, endB)
  const out: DiffLine[] = []
  for (let i = 0; i < start; i++) out.push({ type: 'same', text: a[i] })

  if (midA.length * midB.length <= 2_000_000) {
    // classic LCS DP
    const m = midA.length, n = midB.length
    const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1))
    for (let i = m - 1; i >= 0; i--)
      for (let j = n - 1; j >= 0; j--)
        dp[i][j] = midA[i] === midB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    let i = 0, j = 0
    while (i < m && j < n) {
      if (midA[i] === midB[j]) { out.push({ type: 'same', text: midA[i] }); i++; j++ }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', text: midA[i] }); i++ }
      else { out.push({ type: 'add', text: midB[j] }); j++ }
    }
    while (i < m) out.push({ type: 'del', text: midA[i++] })
    while (j < n) out.push({ type: 'add', text: midB[j++] })
  } else {
    // too large for LCS — naive replace block, honest and explicit
    for (const l of midA) out.push({ type: 'del', text: l })
    for (const l of midB) out.push({ type: 'add', text: l })
  }
  for (let i = endA; i < a.length; i++) out.push({ type: 'same', text: a[i] })
  return out
}

// ─── tool registry ────────────────────────────────────────────────

const I = {
  json: 'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1',
  braces: 'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1',
  markdown: 'M4 6h16M4 12h16M4 18h10',
  binary: 'M6 20v-8M10 20v-8M6 12h4a2 2 0 0 0 2-2V6M14 10h2a2 2 0 0 0 2-2V4M6 18h8',
  globe: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  case: 'M4 18 9 6l5 12M6.5 13h5M13 18h7M13 9h7',
  eraser: 'M7 21h13M4.5 15.5 14 6l4.5 4.5L10 19H6.5a2 2 0 0 1-1.4-.6l-.6-.6a2 2 0 0 1 0-2.8Z',
  sort: 'M4 7h10M4 12h7M4 17h4M15 8v12M15 20l3-3M15 20l-3-3',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  diff: 'M9 7H5v12M9 11h4M9 7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M15 13h4M17 11v4',
  count: 'M4 7h16M4 12h10M4 17h7M17 14v6M14 17h6',
  uuid: 'M8 3h8M8 21h8M10 3v4l-2 2v6l2 2v4M14 3v4l2 2v6l-2 2v4',
  hash: 'M9 4 7 20M17 4l-2 16M4 9h17M3 15h17',
  regex: 'M4 12h4l2-6 4 12 2-6h4',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4',
}

export const TOOLS: ToolDef[] = [
  {
    kind: 'transform', id: 'json', name: 'JSON Formatter', category: 'Format',
    description: 'Validate, pretty-print or minify JSON with precise error reporting.',
    icon: I.json, keywords: ['json', 'format', 'validate', 'minify', 'pretty', 'lint'],
    options: [
      { key: 'mode', label: 'Mode', type: 'select', default: 'pretty', options: [{ value: 'pretty', label: 'Pretty print' }, { value: 'minify', label: 'Minify' }] },
      { key: 'indent', label: 'Indent', type: 'select', default: '2', options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tab' }] },
    ],
    run: formatJson,
  },
  {
    kind: 'markdown', id: 'markdown', name: 'Markdown Preview', category: 'Format',
    description: 'Offline Markdown rendering with live preview. HTML in source is escaped.',
    icon: I.markdown, keywords: ['markdown', 'md', 'preview', 'render', 'html'],
  },
  {
    kind: 'transform', id: 'base64', name: 'Base64 Encode / Decode', category: 'Encode / Decode',
    description: 'UTF-8 safe Base64 encoding and decoding. Runs locally.',
    icon: I.binary, keywords: ['base64', 'encode', 'decode', 'b64', 'binary'],
    options: [{ key: 'mode', label: 'Mode', type: 'select', default: 'encode', options: [{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }] }],
    run: (input, opts) => (opts.mode === 'decode' ? decodeBase64(input) : encodeBase64(input)),
  },
  {
    kind: 'transform', id: 'url', name: 'URL Encode / Decode', category: 'Encode / Decode',
    description: 'Percent-encode or decode URL components.',
    icon: I.globe, keywords: ['url', 'uri', 'encode', 'decode', 'percent', 'query'],
    options: [{ key: 'mode', label: 'Mode', type: 'select', default: 'encode', options: [{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }] }],
    run: (input, opts) => (opts.mode === 'decode' ? decodeUrl(input) : encodeUrl(input)),
  },
  {
    kind: 'transform', id: 'case', name: 'Case Converter', category: 'Text',
    description: 'camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE and more.',
    icon: I.case, keywords: ['case', 'camel', 'pascal', 'snake', 'kebab', 'constant', 'upper', 'lower', 'title', 'sentence'],
    options: [{ key: 'mode', label: 'Mode', type: 'select', default: 'camel', options: [
      { value: 'camel', label: 'camelCase' }, { value: 'pascal', label: 'PascalCase' },
      { value: 'snake', label: 'snake_case' }, { value: 'kebab', label: 'kebab-case' },
      { value: 'constant', label: 'CONSTANT_CASE' }, { value: 'title', label: 'Title Case' },
      { value: 'sentence', label: 'Sentence case' }, { value: 'lower', label: 'lower case' },
      { value: 'upper', label: 'UPPER CASE' }, { value: 'dot', label: 'dot.case' }, { value: 'path', label: 'path/case' },
    ] }],
    run: (input, opts) => convertCase(input, String(opts.mode)),
  },
  {
    kind: 'transform', id: 'whitespace', name: 'Whitespace Cleaner', category: 'Text',
    description: 'Trim trailing spaces, collapse blank lines, strip outer whitespace.',
    icon: I.eraser, keywords: ['trim', 'whitespace', 'spaces', 'blank', 'clean', 'tidy'],
    options: [
      { key: 'trimLineEnds', label: 'Trim trailing spaces', type: 'checkbox', default: true },
      { key: 'collapseBlankLines', label: 'Collapse 3+ blank lines', type: 'checkbox', default: true },
      { key: 'trimOuter', label: 'Trim leading/trailing blank lines', type: 'checkbox', default: true },
      { key: 'tabsToSpaces', label: 'Tabs to 2 spaces', type: 'checkbox', default: false },
    ],
    run: cleanWhitespace,
  },
  {
    kind: 'transform', id: 'dedupe', name: 'Remove Duplicate Lines', category: 'Lines',
    description: 'Drop duplicate lines, keeping first occurrence order.',
    icon: I.copy, keywords: ['duplicate', 'unique', 'dedupe', 'distinct', 'lines'],
    options: [{ key: 'ignoreCase', label: 'Ignore case', type: 'checkbox', default: false }],
    run: dedupeLines,
  },
  {
    kind: 'transform', id: 'sort', name: 'Sort Lines', category: 'Lines',
    description: 'Sort lines alphabetically or numerically, ascending or descending.',
    icon: I.sort, keywords: ['sort', 'order', 'alphabetical', 'numeric', 'lines'],
    options: [
      { key: 'order', label: 'Order', type: 'select', default: 'asc', options: [{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }] },
      { key: 'ignoreCase', label: 'Ignore case', type: 'checkbox', default: false },
      { key: 'numeric', label: 'Numeric sort', type: 'checkbox', default: false },
      { key: 'dropEmpty', label: 'Drop empty lines', type: 'checkbox', default: false },
    ],
    run: sortLines,
  },
  {
    kind: 'diff', id: 'diff', name: 'Text Diff', category: 'Text',
    description: 'Line-by-line comparison with an LCS-based algorithm.',
    icon: I.diff, keywords: ['diff', 'compare', 'difference', 'changes', 'lcs'],
  },
  {
    kind: 'count', id: 'count', name: 'Word & Character Counter', category: 'Text',
    description: 'Words, characters, lines, paragraphs, bytes and reading time.',
    icon: I.count, keywords: ['count', 'words', 'characters', 'lines', 'wc', 'bytes', 'reading'],
  },
  {
    kind: 'uuid', id: 'uuid', name: 'UUID Generator', category: 'Dev',
    description: 'Cryptographically random v4 UUIDs, generated locally.',
    icon: I.uuid, keywords: ['uuid', 'guid', 'random', 'id', 'v4'],
  },
  {
    kind: 'transform', id: 'hash', name: 'Hash Calculator', category: 'Crypto',
    description: 'SHA-1, SHA-256, SHA-384 and SHA-512 digests via Web Crypto.',
    icon: I.hash, keywords: ['hash', 'sha1', 'sha256', 'sha384', 'sha512', 'digest', 'checksum'],
    options: [{ key: 'algo', label: 'Algorithm', type: 'select', default: 'SHA-256', options: [
      { value: 'SHA-1', label: 'SHA-1' }, { value: 'SHA-256', label: 'SHA-256' },
      { value: 'SHA-384', label: 'SHA-384' }, { value: 'SHA-512', label: 'SHA-512' },
    ] }],
    run: (input, opts) => hashText(input, String(opts.algo)),
  },
  {
    kind: 'regex', id: 'regex', name: 'Regex Tester', category: 'Dev',
    description: 'Test regular expressions with live match highlighting and capture groups.',
    icon: I.regex, keywords: ['regex', 'regexp', 'pattern', 'match', 'test', 'groups'],
  },
  {
    kind: 'transform', id: 'html', name: 'HTML Entity Encode / Decode', category: 'Encode / Decode',
    description: 'Encode &, <, >, quotes (optionally all non-ASCII) or decode named and numeric entities.',
    icon: I.code, keywords: ['html', 'entity', 'entities', 'escape', 'unescape', 'amp', 'nbsp'],
    options: [
      { key: 'mode', label: 'Mode', type: 'select', default: 'encode', options: [{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }] },
      { key: 'all', label: 'Encode all non-ASCII', type: 'checkbox', default: false },
    ],
    run: (input, opts) =>
      opts.mode === 'decode' ? decodeHtmlEntities(input) : encodeHtmlEntities(input, opts),
  },
]

export const TOOL_CATEGORIES: ToolCategory[] = ['Format', 'Encode / Decode', 'Lines', 'Text', 'Crypto', 'Dev']

export function searchTools(query: string): ToolDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return TOOLS
  const scored = TOOLS.map((t) => {
    const hay = [t.name, t.description, t.category, ...t.keywords].join(' ').toLowerCase()
    const nameHit = t.name.toLowerCase().includes(q)
    const hits = t.keywords.filter((k) => k.startsWith(q)).length
    return { t, s: (nameHit ? 10 : 0) + hits + (hay.includes(q) ? 2 : 0) }
  }).filter((x) => x.s > 0)
  return scored.sort((a, b) => b.s - a.s).map((x) => x.t)
}

export function toolById(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id)
}
