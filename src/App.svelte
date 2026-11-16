<script lang="ts">
  import { onMount } from 'svelte'
  import { TOOLS, searchTools, toolById, type ToolDef } from './lib/textTools'
  import { cycleTheme, getPref, type ThemePref } from './lib/theme'
  import TransformTool from './components/TransformTool.svelte'
  import DiffTool from './components/DiffTool.svelte'
  import MarkdownTool from './components/MarkdownTool.svelte'
  import CountTool from './components/CountTool.svelte'
  import UuidTool from './components/UuidTool.svelte'
  import RegexTool from './components/RegexTool.svelte'

  let query = $state('')
  let selectedId = $state('json')
  let activeIndex = $state(0)
  let favorites = $state<string[]>([])
  let recents = $state<string[]>([])
  let favOnly = $state(false)
  let themePref = $state<ThemePref>('system')
  let toastMsg = $state('')
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let searchEl: HTMLInputElement | undefined
  let lastOutput = $state('')
  let lastCopyable = $state(false)

  const results = $derived.by(() => {
    let list = query.trim() ? searchTools(query) : [...TOOLS]
    if (favOnly) list = list.filter((t) => favorites.includes(t.id))
    return list
  })
  const selected = $derived(toolById(selectedId) ?? TOOLS[0])
  const favSet = $derived(new Set(favorites))
  const recentTools = $derived(recents.map(toolById).filter((t): t is ToolDef => !!t))

  function toast(msg: string) {
    toastMsg = msg
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastMsg = ''), 1800)
  }

  function selectTool(id: string) {
    selectedId = id
    recents = [id, ...recents.filter((r) => r !== id)].slice(0, 8)
    localStorage.setItem('tf-recents', JSON.stringify(recents))
    lastCopyable = false
    lastOutput = ''
  }

  function toggleFavorite(id: string) {
    favorites = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]
    localStorage.setItem('tf-favorites', JSON.stringify(favorites))
  }

  async function copyLastOutput() {
    if (!lastCopyable) return
    await navigator.clipboard.writeText(lastOutput)
    toast('Copied to clipboard')
  }

  function handleOutput(text: string, copyable: boolean) {
    lastOutput = text
    lastCopyable = copyable
  }

  onMount(() => {
    favorites = JSON.parse(localStorage.getItem('tf-favorites') ?? '[]')
    recents = JSON.parse(localStorage.getItem('tf-recents') ?? '[]')
    themePref = getPref()
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchEl?.focus()
        return
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copyLastOutput()
        return
      }
      if (document.activeElement === searchEl) {
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, results.length - 1) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0) }
        else if (e.key === 'Enter' && results[activeIndex]) { selectTool(results[activeIndex].id) }
        else if (e.key === 'Escape') { query = ''; searchEl?.blur() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function onQueryInput() { activeIndex = 0 }
  function cycleAppTheme() { themePref = cycleTheme() }
</script>

<div class="layout">
  <!-- ── Sidebar ─────────────────────────────── -->
  <aside class="sidebar">
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--accent)" />
        <path d="M12.5 11.5 8 16l4.5 4.5M19.5 11.5 24 16l-4.5 4.5" stroke="#fff" stroke-width="2"
              fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div>
        <div class="brand-name">TextForge</div>
        <div class="brand-sub dim">offline dev tools</div>
      </div>
    </div>

    <div class="search-wrap">
      <svg viewBox="0 0 24 24" class="search-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
      </svg>
      <input
        bind:this={searchEl}
        bind:value={query}
        oninput={onQueryInput}
        class="search"
        type="text"
        placeholder="Search tools…"
        aria-label="Search tools"
        spellcheck="false"
        autocomplete="off"
      />
      <kbd class="kbd">Ctrl K</kbd>
    </div>

    <div class="list-head">
      <span class="dim">{favOnly ? 'Favorites' : query ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'All tools'}</span>
      <button class="icon-btn" class:active={favOnly} onclick={() => (favOnly = !favOnly)}
              title="Toggle favorites filter" aria-pressed={favOnly}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill={favOnly ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    </div>

    <nav class="tool-list" aria-label="Tools">
      {#each results as tool, i (tool.id)}
        <div class="tool-row" class:selected={tool.id === selectedId} class:kbd-active={i === activeIndex && query.trim() !== ''}>
          <button class="tool-btn" onclick={() => selectTool(tool.id)} aria-current={tool.id === selectedId ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" class="tool-icon" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d={tool.icon} />
            </svg>
            <span class="tool-name">{tool.name}</span>
          </button>
          <button class="icon-btn star" class:starred={favSet.has(tool.id)} onclick={() => toggleFavorite(tool.id)}
                  title={favSet.has(tool.id) ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label="Toggle favorite">
            <svg viewBox="0 0 24 24" width="15" height="15" fill={favSet.has(tool.id) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>
      {/each}
      {#if results.length === 0}
        <div class="empty dim">No tools match “{query}”</div>
      {/if}
    </nav>

    <div class="sidebar-foot">
      {#if recentTools.length > 0 && !query}
        <div class="recent-label dim">Recent</div>
        <div class="recent-chips">
          {#each recentTools.slice(0, 4) as tool (tool.id)}
            <button class="chip recent" onclick={() => selectTool(tool.id)}>{tool.name.split(' ')[0]}</button>
          {/each}
        </div>
      {/if}
      <button class="icon-btn theme-toggle" onclick={cycleAppTheme} title="Cycle theme (system → light → dark)">
        {#if themePref === 'light'}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
        {:else if themePref === 'dark'}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        {:else}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>
        {/if}
        <span class="theme-label dim">{themePref}</span>
      </button>
    </div>
  </aside>

  <!-- ── Main pane ───────────────────────────── -->
  <main class="main">
    <header class="toolbar">
      <div class="toolbar-text">
        <h1>{selected.name}</h1>
        <p class="dim">{selected.description}</p>
      </div>
      <div class="toolbar-actions">
        <button class="icon-btn" class:active={favSet.has(selected.id)} onclick={() => toggleFavorite(selected.id)}
                title="Toggle favorite" aria-pressed={favSet.has(selected.id)}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill={favSet.has(selected.id) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        <button class="btn btn-ghost btn-sm" onclick={copyLastOutput} disabled={!lastCopyable} title="Copy output (Ctrl+Shift+C)">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          Copy
        </button>
      </div>
    </header>

    <section class="content">
      {#if selected.kind === 'transform'}
        {#key selected.id}
          <TransformTool tool={selected} {toast} onOutput={handleOutput} />
        {/key}
      {:else if selected.kind === 'diff'}
        <DiffTool {toast} onOutput={handleOutput} />
      {:else if selected.kind === 'markdown'}
        <MarkdownTool />
      {:else if selected.kind === 'count'}
        <CountTool />
      {:else if selected.kind === 'uuid'}
        <UuidTool {toast} onOutput={handleOutput} />
      {:else if selected.kind === 'regex'}
        <RegexTool {toast} onOutput={handleOutput} />
      {/if}
    </section>

    <footer class="statusbar">
      <span class="dim">{selected.category}</span>
      <span class="status-right">
        <span class="chip offline">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" /></svg>
          Offline · no network
        </span>
        <span class="dim">v0.1.0</span>
      </span>
    </footer>
  </main>

  {#if toastMsg}<div class="toast" role="status">{toastMsg}</div>{/if}
</div>

<style>
  .layout { display: flex; height: 100%; overflow: hidden; }

  /* Sidebar */
  .sidebar {
    width: 236px; flex: 0 0 236px; display: flex; flex-direction: column;
    background: var(--bg-elevated); border-right: 1px solid var(--border);
    padding: .8rem .65rem .6rem; gap: .5rem; min-height: 0;
  }
  .brand { display: flex; align-items: center; gap: .55rem; padding: .1rem .25rem .2rem; }
  .brand-mark { width: 30px; height: 30px; }
  .brand-name { font-weight: 650; font-size: 1.02rem; letter-spacing: -0.01em; }
  .brand-sub { font-size: .68rem; }

  .search-wrap { position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: .55rem; width: 15px; height: 15px; color: var(--fg-dim); pointer-events: none; }
  .search {
    font: inherit; width: 100%; color: var(--fg); background: var(--bg-inset);
    border: 1px solid transparent; border-radius: var(--radius-sm);
    padding: .42rem .6rem .42rem 1.9rem; outline: none;
  }
  .search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .search-wrap .kbd { position: absolute; right: .45rem; }

  .list-head { display: flex; justify-content: space-between; align-items: center; padding: 0 .25rem; font-size: .75rem; }
  .tool-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; min-height: 0; }
  .tool-row { display: flex; align-items: center; border-radius: var(--radius-sm); }
  .tool-row:hover { background: var(--bg-hover); }
  .tool-row.selected { background: var(--accent-soft); }
  .tool-row.selected .tool-icon { color: var(--accent); }
  .tool-row.kbd-active { outline: 1.5px solid var(--accent); }
  .tool-btn {
    flex: 1; display: flex; align-items: center; gap: .55rem; min-width: 0;
    background: none; border: none; color: var(--fg); text-align: left;
    padding: .4rem .45rem; cursor: pointer; border-radius: var(--radius-sm);
  }
  .tool-icon { width: 17px; height: 17px; flex: 0 0 17px; color: var(--fg-dim); }
  .tool-name { font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .star { opacity: 0; }
  .tool-row:hover .star, .star.starred { opacity: 1; }
  .star.starred { color: #eab308; }
  .empty { padding: 1rem .5rem; font-size: .85rem; text-align: center; }

  .sidebar-foot { border-top: 1px solid var(--border); padding-top: .5rem; display: flex; flex-direction: column; gap: .35rem; }
  .recent-label { font-size: .68rem; padding: 0 .25rem; text-transform: uppercase; letter-spacing: .06em; }
  .recent-chips { display: flex; flex-wrap: wrap; gap: .3rem; padding: 0 .25rem; }
  .recent { border: none; cursor: pointer; font-size: .75rem; }
  .recent:hover { background: var(--accent-soft); color: var(--accent); }
  .theme-toggle { display: flex; align-items: center; gap: .45rem; align-self: flex-start; padding: .35rem .5rem; }
  .theme-label { font-size: .75rem; text-transform: capitalize; }

  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .toolbar {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: .7rem 1rem; border-bottom: 1px solid var(--border); background: var(--bg-elevated);
  }
  .toolbar-text h1 { margin: 0; font-size: 1.02rem; font-weight: 650; letter-spacing: -0.01em; }
  .toolbar-text p { margin: .1rem 0 0; font-size: .78rem; }
  .toolbar-actions { display: flex; align-items: center; gap: .35rem; flex: 0 0 auto; }
  .icon-btn.active { color: var(--accent); }

  .content { flex: 1; min-height: 0; overflow: auto; padding: .8rem 1rem; }

  .statusbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: .35rem 1rem; border-top: 1px solid var(--border); font-size: .75rem;
    background: var(--bg-elevated);
  }
  .status-right { display: flex; align-items: center; gap: .6rem; }
  .offline { color: var(--ok); }

  @media (max-width: 860px) {
    .sidebar { width: 190px; flex-basis: 190px; }
    .toolbar-text p { display: none; }
  }
</style>
