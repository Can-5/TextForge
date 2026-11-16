# TextForge

**Offline text & developer tools for your desktop.** No accounts, no cloud, no telemetry — every tool runs entirely on your machine.

![Platform](https://img.shields.io/badge/platform-Linux%20%C2%B7%20Windows%20%C2%B7%20macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-0.1.0-orange)

## What it is

TextForge is a fast, keyboard-driven desktop app bundling the small text utilities developers reach for every day. It is a Tauri 2 application: a Rust shell with a Svelte + TypeScript frontend. There is **no backend server and no network access** — the app makes zero outbound connections.

## Tools

| # | Tool | What it does |
|---|------|--------------|
| 1 | JSON Formatter | Validate, pretty-print (2/4 spaces or tabs) or minify JSON; precise error messages |
| 2 | Markdown Preview | Live offline preview; raw HTML is escaped; links sanitized (`http(s)`/`mailto` only) |
| 3 | Base64 | UTF-8 safe encode/decode |
| 4 | URL Encode / Decode | Percent-encoding for URL components |
| 5 | Case Converter | camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title/Sentence/dot/path |
| 6 | Whitespace Cleaner | Trim trailing spaces, collapse 3+ blank lines, strip outer blanks, tabs→spaces |
| 7 | Remove Duplicate Lines | Keep first occurrence; optional case-insensitive |
| 8 | Sort Lines | Asc/desc, case-insensitive, numeric, optional empty-line drop |
| 9 | Text Diff | Live line diff (LCS with prefix/suffix trimming, capped at 2M cells); copy as unified diff |
| 10 | Word & Character Counter | Words, chars (± spaces), lines, paragraphs, UTF-8 bytes, reading time |
| 11 | UUID Generator | v4 UUIDs via `crypto.randomUUID()`; 1/5/10/25/50 at once; uppercase/no-hyphen options |
| 12 | Hash Calculator | SHA-1/256/384/512 via Web Crypto |
| 13 | Regex Tester | Live match highlighting, capture groups, global/ignore-case/multiline/dotAll flags |
| 14 | HTML Entity Encode / Decode | Named + numeric entities; optional all-non-ASCII encoding |

### Extras

- **Search** (`Ctrl/Cmd + K`) across all tools with keyboard navigation (↑/↓/Enter)
- **Favorites** (star any tool, filter sidebar to favorites)
- **Recently used** tools (last 4 shown in sidebar)
- **Copy output** of any transform tool with `Ctrl/Cmd + Shift + C`
- **Light / dark / system theme**, persisted across sessions
- **Responsive** layout; opens in ~1s, uses <100 MB RAM

## Install

### From source

Prerequisites: [Node.js](https://nodejs.org) ≥ 20, [pnpm](https://pnpm.io) ≥ 9, [Rust](https://rustup.rs) (stable), and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
git clone <this-repo> textforge && cd textforge
pnpm install
pnpm tauri dev      # run in development mode
pnpm tauri build    # produce an installer/bundle for your OS
```

Build artifacts land in `src-tauri/target/release/bundle/`.

## Development

```bash
pnpm install        # install frontend deps
pnpm test           # unit tests (vitest) — tools logic, markdown renderer, diff, registry
pnpm build          # type-check + production frontend build
cd src-tauri && cargo test && cargo build
```

CI (GitHub Actions, `.github/workflows/ci.yml`) runs the frontend tests and build on every push/PR, plus a `tauri build` bundle job on Ubuntu, Windows and macOS.

### Project layout

```
├── src/
│   ├── App.svelte            # shell: sidebar, search, favorites, routing, shortcuts
│   ├── components/           # one focused component per tool kind
│   ├── lib/textTools.ts      # all tool logic as pure, unit-tested functions
│   ├── lib/textTools.test.ts # vitest suite
│   ├── lib/markdown.ts       # minimal safe Markdown renderer
│   └── lib/theme.ts          # system/light/dark theme handling
└── src-tauri/                # Rust shell (no commands needed — pure frontend logic)
```

## Privacy & security

- 100% offline: the CSP allows only `'self'` + IPC; the app ships no analytics, crash reporting or update checks.
- Markdown rendering escapes raw HTML and sanitizes link/image URLs.
- No data is written outside the app except your local preferences (`localStorage`: theme, favorites, recents).

## Platform notes & limitations

- **Linux** (X11/Wayland, KDE Plasma tested): works out of the box; needs `libwebkit2gtk-4.1` at runtime.
- **Windows**: needs WebView2 (bundled by the installer on modern Windows; otherwise the [Evergreen bootstrapper](https://developer.microsoft.com/microsoft-edge/webview2/) is used).
- **macOS**: universal builds via CI; first run may require allowing the app in Gatekeeper since binaries are unsigned by default.
- Diff LCS is capped at 2M cells; larger inputs degrade to a coarse block diff (this is indicated in the code, not hidden).

## License

MIT — see [LICENSE](./LICENSE).
