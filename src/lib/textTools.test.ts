import { describe, it, expect } from 'vitest'
import {
  formatJson, encodeBase64, decodeBase64, encodeUrl, decodeUrl, convertCase,
  cleanWhitespace, dedupeLines, sortLines, encodeHtmlEntities, decodeHtmlEntities,
  countText, diffLines, searchTools, generateUuids, hashText, TOOLS,
} from './textTools'
import { renderMarkdown } from './markdown'

describe('formatJson', () => {
  it('pretty prints with 2 spaces by default', () => {
    expect(formatJson('{"a":1,"b":[2,3]}', { mode: 'pretty', indent: '2' }))
      .toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}')
  })
  it('minifies', () => {
    expect(formatJson('{ "a": 1 }', { mode: 'minify', indent: '2' })).toBe('{"a":1}')
  })
  it('throws on invalid JSON', () => {
    expect(() => formatJson('{nope', { mode: 'pretty', indent: '2' })).toThrow()
  })
})

describe('base64', () => {
  it('round-trips UTF-8', () => {
    const s = 'Merhaba — dünya ✓ 42'
    expect(decodeBase64(encodeBase64(s))).toBe(s)
  })
  it('rejects invalid base64', () => {
    expect(() => decodeBase64('!!!not-base64!!!')).toThrow()
  })
})

describe('url', () => {
  it('round-trips', () => {
    expect(decodeUrl(encodeUrl('a b&c=d%'))).toBe('a b&c=d%')
  })
  it('encodes special chars', () => {
    expect(encodeUrl('a b&c')).toBe('a%20b%26c')
  })
})

describe('convertCase', () => {
  const input = 'hello world_fooBar-baz'
  it('camelCase', () => expect(convertCase(input, 'camel')).toBe('helloWorldFooBarBaz'))
  it('PascalCase', () => expect(convertCase(input, 'pascal')).toBe('HelloWorldFooBarBaz'))
  it('snake_case', () => expect(convertCase(input, 'snake')).toBe('hello_world_foo_bar_baz'))
  it('kebab-case', () => expect(convertCase(input, 'kebab')).toBe('hello-world-foo-bar-baz'))
  it('CONSTANT_CASE', () => expect(convertCase(input, 'constant')).toBe('HELLO_WORLD_FOO_BAR_BAZ'))
  it('UPPER', () => expect(convertCase('foo bar', 'upper')).toBe('FOO BAR'))
  it('sentence', () => expect(convertCase('hello world', 'sentence')).toBe('Hello world'))
  it('handles acronyms reasonably', () => expect(convertCase('HTTPSConnection2FA', 'snake')).toBe('httpsconnection2_fa'))
})

describe('cleanWhitespace', () => {
  it('trims trailing spaces and collapses blank lines', () => {
    const input = 'a   \n\n\n\nb  '
    expect(cleanWhitespace(input, { trimLineEnds: true, collapseBlankLines: true, trimOuter: true, tabsToSpaces: false }))
      .toBe('a\n\nb')
  })
  it('converts tabs', () => {
    expect(cleanWhitespace('\ta', { trimLineEnds: false, collapseBlankLines: false, trimOuter: false, tabsToSpaces: true })).toBe('  a')
  })
})

describe('dedupeLines', () => {
  it('keeps first occurrence, preserves order', () => {
    expect(dedupeLines('b\na\nb\nc\na', { ignoreCase: false })).toBe('b\na\nc')
  })
  it('ignoreCase folds', () => {
    expect(dedupeLines('Foo\nFOO\nfoo', { ignoreCase: true })).toBe('Foo')
  })
})

describe('sortLines', () => {
  it('ascending alphabetical', () => {
    expect(sortLines('banana\napple\ncherry', { order: 'asc', ignoreCase: false, numeric: false, dropEmpty: false }))
      .toBe('apple\nbanana\ncherry')
  })
  it('descending', () => {
    expect(sortLines('a\nb\nc', { order: 'desc', ignoreCase: false, numeric: false, dropEmpty: false })).toBe('c\nb\na')
  })
  it('numeric', () => {
    expect(sortLines('10\n2\n1\nabc', { order: 'asc', ignoreCase: false, numeric: true, dropEmpty: false }))
      .toBe('1\n2\n10\nabc')
  })
  it('dropEmpty', () => {
    expect(sortLines('b\n\na', { order: 'asc', ignoreCase: false, numeric: false, dropEmpty: true })).toBe('a\nb')
  })
})

describe('html entities', () => {
  it('encodes special chars', () => {
    expect(encodeHtmlEntities('<a href="x">&\'', { all: false })).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
  it('encodes all non-ascii when asked', () => {
    expect(encodeHtmlEntities('héllo', { all: true })).toBe('h&#233;llo')
  })
  it('decodes named and numeric', () => {
    expect(decodeHtmlEntities('&lt;a&gt;&amp;&#233;&#x27;&quot;')).toBe('<a>&é\'"')
  })
  it('round-trips common text', () => {
    const s = 'Fish & Chips <tag> "quotes"'
    expect(decodeHtmlEntities(encodeHtmlEntities(s, { all: true }))).toBe(s)
  })
})

describe('countText', () => {
  it('counts correctly', () => {
    const r = countText('hello world\nsecond line\n\nnew para')
    expect(r.words).toBe(6)
    expect(r.lines).toBe(4)
    expect(r.paragraphs).toBe(2)
    expect(r.bytes).toBe(new TextEncoder().encode('hello world\nsecond line\n\nnew para').length)
  })
  it('empty string', () => {
    expect(countText('').words).toBe(0)
  })
})

describe('diffLines', () => {
  it('marks additions and deletions', () => {
    const d = diffLines('a\nb\nc', 'a\nx\nc')
    expect(d).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'add', text: 'x' },
      { type: 'same', text: 'c' },
    ])
  })
  it('pure insertion', () => {
    const d = diffLines('a', 'a\nb')
    expect(d.filter((l) => l.type === 'add')).toHaveLength(1)
  })
})

describe('searchTools', () => {
  it('finds by name', () => {
    expect(searchTools('json')[0].id).toBe('json')
  })
  it('finds by keyword', () => {
    expect(searchTools('sha')[0].id).toBe('hash')
  })
  it('returns all for empty query', () => {
    expect(searchTools('')).toHaveLength(TOOLS.length)
  })
})

describe('generateUuids', () => {
  it('generates the requested count of valid v4 UUIDs', () => {
    const out = generateUuids(5, {}).split('\n')
    expect(out).toHaveLength(5)
    for (const u of out) {
      expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    }
  })
  it('supports uppercase + no hyphens', () => {
    const u = generateUuids(1, { uppercase: true, noHyphens: true })
    expect(u).toMatch(/^[0-9A-F]{32}$/)
  })
})

describe('hashText', () => {
  it('SHA-256 of "abc" is the well-known digest', async () => {
    expect(await hashText('abc', 'SHA-256')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('renderMarkdown', () => {
  it('renders headings and bold', () => {
    expect(renderMarkdown('# Hi **there**')).toContain('<h1>Hi <strong>there</strong></h1>')
  })
  it('escapes raw HTML / scripts', () => {
    const out = renderMarkdown('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })
  it('rejects javascript: links', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href=')
  })
  it('allows https links', () => {
    expect(renderMarkdown('[x](https://example.com)')).toContain('href="https://example.com"')
  })
  it('renders fenced code escaped', () => {
    const out = renderMarkdown('```\n<b>hi</b>\n```')
    expect(out).toContain('&lt;b&gt;hi&lt;/b&gt;')
    expect(out).toContain('<pre><code')
  })
  it('renders lists', () => {
    expect(renderMarkdown('- a\n- b')).toContain('<ul>\n<li>a</li>\n<li>b</li>\n</ul>')
  })
})
