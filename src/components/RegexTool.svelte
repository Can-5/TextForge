<script lang="ts">
  interface Props {
    toast: (msg: string) => void
    onOutput: (text: string, copyable: boolean) => void
  }
  let { toast, onOutput }: Props = $props()

  let pattern = $state('(\\w+)@(\\w+\\.\\w+)')
  let flags = $state({ g: true, i: false, m: false, s: false })
  let text = $state('Contact us at dev@acme.com or support@example-site.org — or backup@acme.com.')

  interface MatchInfo { index: number; text: string; groups: (string | undefined)[] }

  const result = $derived.by(() => {
    const flagStr = (flags.g ? 'g' : '') + (flags.i ? 'i' : '') + (flags.m ? 'm' : '') + (flags.s ? 's' : '')
    let re: RegExp
    try {
      re = new RegExp(pattern, flagStr.includes('g') ? flagStr : flagStr + 'g')
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e), matches: [] as MatchInfo[], preview: escape(text) }
    }
    const matches: MatchInfo[] = []
    let m: RegExpExecArray | null
    let guard = 0
    while ((m = re.exec(text)) !== null && guard++ < 1000) {
      matches.push({ index: m.index, text: m[0], groups: m.slice(1) })
      if (m.index === re.lastIndex) re.lastIndex++ // zero-width safety
    }
    // highlighted preview (cap to first 5k chars of source)
    const cap = text.slice(0, 5000)
    let preview = ''
    let last = 0
    for (const mInfo of matches) {
      if (mInfo.index >= cap.length) break
      const safeStart = last
      preview += escape(cap.slice(safeStart, mInfo.index)) + '<mark>' + escape(mInfo.text) + '</mark>'
      last = mInfo.index + mInfo.text.length
    }
    preview += escape(cap.slice(last))
    return { error: '', matches, preview }
  })

  function escape(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  $effect(() => {
    onOutput(result.matches.map((m) => m.text).join('\n'), result.matches.length > 0)
  })

  async function copyMatches() {
    await navigator.clipboard.writeText(result.matches.map((m) => m.text).join('\n'))
    toast('Matches copied')
  }
</script>

<div class="regex-wrap">
  <div class="pattern-bar card">
    <span class="delim dim">/</span>
    <input class="input mono pattern" bind:value={pattern} spellcheck="false" placeholder="regular expression…" aria-label="Regular expression" />
    <span class="delim dim">/{(flags.g ? 'g' : '') + (flags.i ? 'i' : '') + (flags.m ? 'm' : '') + (flags.s ? 's' : '')}</span>
    <div class="flag-checks">
      {#each Object.entries({ g: 'global', i: 'ignore case', m: 'multiline', s: 'dotAll' }) as [f, label] (f)}
        <label class="check" title={label}><input type="checkbox" bind:checked={flags[f as 'g' | 'i' | 'm' | 's']} /> {f}</label>
      {/each}
    </div>
  </div>

  {#if result.error}
    <div class="error-box mono" role="alert"><strong>Invalid pattern</strong><span>{result.error}</span></div>
  {:else}
    <div class="test-area">
      <div class="pane">
        <div class="pane-head"><span class="pane-title">Test string</span><span class="badge-ok">{result.matches.length} match{result.matches.length === 1 ? '' : 'es'}</span></div>
        <textarea class="input editor mono" bind:value={text} spellcheck="false" aria-label="Test string"></textarea>
      </div>
      <div class="pane">
        <div class="pane-head"><span class="pane-title">Highlighted</span><button class="btn-ghost btn btn-sm" onclick={copyMatches} disabled={result.matches.length === 0}>Copy matches</button></div>
        <div class="preview mono">{@html result.preview}</div>
        <div class="groups">
          {#each result.matches.slice(0, 20) as m, i (i)}
            <div class="match-row">
              <span class="match-idx dim">#{i + 1} @{m.index}</span>
              <code class="match-text">{m.text}</code>
              {#if m.groups.length}
                <span class="match-groups dim">groups: {m.groups.map((g) => (g === undefined ? '—' : JSON.stringify(g))).join(', ')}</span>
              {/if}
            </div>
          {/each}
          {#if result.matches.length > 20}<div class="dim pad">… and {result.matches.length - 20} more</div>{/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .regex-wrap { display: flex; flex-direction: column; gap: .6rem; height: 100%; min-height: 0; }
  .pattern-bar { display: flex; align-items: center; gap: .4rem; padding: .5rem .7rem; }
  .delim { font-size: 1.1rem; }
  .pattern { flex: 1; }
  .flag-checks { display: flex; gap: .5rem; }
  .check { display: flex; align-items: center; gap: .2rem; font-size: .8rem; cursor: pointer; }
  .test-area { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; flex: 1; min-height: 0; }
  .pane { display: flex; flex-direction: column; min-height: 0; }
  .pane-head { display: flex; justify-content: space-between; align-items: center; padding: .1rem .1rem .35rem; }
  .pane-title { font-size: .75rem; font-weight: 600; color: var(--fg-dim); text-transform: uppercase; letter-spacing: .07em; }
  .editor { flex: 1; resize: none; font-size: .82rem; line-height: 1.6; }
  .preview { flex: 1.2; overflow: auto; background: var(--bg-inset); border-radius: var(--radius-sm); padding: .6rem .7rem; font-size: .78rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
  .preview :global(mark) { background: color-mix(in srgb, var(--accent) 45%, transparent); color: inherit; border-radius: 2px; padding: 0 1px; outline: 1px solid var(--accent); }
  .groups { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: .25rem; padding-top: .4rem; min-height: 0; }
  .match-row { display: flex; gap: .5rem; align-items: baseline; font-size: .75rem; border-bottom: 1px solid var(--border); padding: .25rem .1rem; flex-wrap: wrap; }
  .match-idx { flex: 0 0 auto; font-size: .68rem; }
  .match-text { background: var(--bg-inset); border-radius: 4px; padding: .05rem .3rem; word-break: break-all; }
  .match-groups { font-size: .7rem; word-break: break-all; }
  .pad { padding: .3rem .1rem; }
  .error-box { border: 1px solid var(--danger); background: var(--danger-soft); color: var(--danger); border-radius: var(--radius-sm); padding: .7rem .8rem; display: flex; flex-direction: column; gap: .4rem; font-size: .8rem; }
  @media (max-width: 900px) { .test-area { grid-template-columns: 1fr; } .flag-checks { flex-wrap: wrap; } }
</style>
