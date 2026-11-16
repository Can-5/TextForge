<script lang="ts">
  import { diffLines, type DiffLine } from '../lib/textTools'

  interface Props {
    toast: (msg: string) => void
    onOutput: (text: string, copyable: boolean) => void
  }
  let { toast, onOutput }: Props = $props()

  let oldText = $state('')
  let newText = $state('')
  let lines = $state<DiffLine[]>([])
  let added = $state(0)
  let removed = $state(0)
  let computed = $state(false)
  let debounce: ReturnType<typeof setTimeout> | undefined

  const MAX_RENDER = 4000
  const rendered = $derived(lines.slice(0, MAX_RENDER))

  function compute() {
    lines = diffLines(oldText, newText)
    added = lines.filter((l) => l.type === 'add').length
    removed = lines.filter((l) => l.type === 'del').length
    computed = true
    const unified = lines.map((l) => (l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  ') + l.text).join('\n')
    onOutput(unified, unified.length > 0)
  }
  function schedule() {
    clearTimeout(debounce)
    debounce = setTimeout(compute, 200)
  }

  async function copyDiff() {
    const unified = lines.map((l) => (l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  ') + l.text).join('\n')
    await navigator.clipboard.writeText(unified)
    toast('Unified diff copied')
  }
  function loadExample() {
    oldText = 'const greeting = "hello";\nfunction main() {\n  console.log(greeting);\n  return 0;\n}\nmain();'
    newText = 'const greeting = "hello world";\nfunction main(verbose = false) {\n  if (verbose) console.log(greeting);\n  return 0;\n}\nmain(true);'
    schedule()
  }
</script>

<div class="diff-wrap">
  <div class="inputs">
    <div class="pane">
      <div class="pane-head"><span class="pane-title">Original</span></div>
      <textarea class="input editor mono" bind:value={oldText} oninput={schedule} spellcheck="false" placeholder="Original text…" aria-label="Original text"></textarea>
    </div>
    <div class="pane">
      <div class="pane-head"><span class="pane-title">Changed</span>
        <button class="btn-ghost btn btn-sm" onclick={loadExample}>Example</button>
      </div>
      <textarea class="input editor mono" bind:value={newText} oninput={schedule} spellcheck="false" placeholder="Changed text…" aria-label="Changed text"></textarea>
    </div>
  </div>

  <div class="result-head">
    <span class="pane-title">Diff</span>
    {#if computed}
      <span class="counts"><span class="badge-ok">+{added}</span> <span class="badge-danger">−{removed}</span></span>
      <button class="btn-ghost btn btn-sm" onclick={copyDiff}>Copy unified diff</button>
    {/if}
  </div>
  <div class="diff-out mono" aria-label="Diff output">
    {#if lines.length === 0}
      <div class="dim placeholder">Paste text in both panes — the diff updates live.</div>
    {:else}
      {#each rendered as line, i (i)}
        <div class="dl {line.type}"><span class="sign">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ''}</span>{line.text || ' '}</div>
      {/each}
      {#if lines.length > MAX_RENDER}
        <div class="dim placeholder">… {lines.length - MAX_RENDER} more lines (output truncated for display)</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .diff-wrap { display: flex; flex-direction: column; gap: .5rem; height: 100%; min-height: 0; }
  .inputs { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; flex: 1 1 45%; min-height: 0; }
  .pane { display: flex; flex-direction: column; min-height: 0; }
  .pane-head { display: flex; justify-content: space-between; padding: .1rem .1rem .35rem; }
  .pane-title { font-size: .75rem; font-weight: 600; color: var(--fg-dim); text-transform: uppercase; letter-spacing: .07em; }
  .editor { flex: 1; resize: none; font-size: .8rem; line-height: 1.5; }
  .result-head { display: flex; align-items: center; gap: .7rem; }
  .counts { display: flex; gap: .4rem; }
  .diff-out {
    flex: 1 1 45%; min-height: 0; overflow: auto; background: var(--bg-inset);
    border-radius: var(--radius-sm); font-size: .78rem; line-height: 1.55; padding: .3rem 0;
  }
  .dl { display: flex; gap: .6rem; padding: 0 .7rem; white-space: pre; }
  .dl .sign { width: 1ch; opacity: .8; user-select: none; }
  .dl.add { background: var(--ok-soft); }
  .dl.del { background: var(--danger-soft); }
  .dl.same { color: var(--fg-dim); }
  .placeholder { padding: .8rem; font-size: .85rem; }
</style>
