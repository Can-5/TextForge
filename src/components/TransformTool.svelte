<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { TransformDef } from '../lib/textTools'

  interface Props {
    tool: TransformDef
    toast: (msg: string) => void
    onOutput: (text: string, copyable: boolean) => void
  }
  let { tool, toast, onOutput }: Props = $props()

  let input = $state('')
  let output = $state('')
  let error = $state('')
  let busy = $state(false)
  let opts = $state<Record<string, string | boolean>>(
    Object.fromEntries(tool.options.map((o) => [o.key, o.default]))
  )
  let debounce: ReturnType<typeof setTimeout> | undefined

  async function run() {
    busy = true
    error = ''
    try {
      const result = await tool.run(input, { ...opts })
      output = result
      onOutput(result, result.length > 0)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      output = ''
      onOutput('', false)
    } finally {
      busy = false
    }
  }

  function schedule() {
    clearTimeout(debounce)
    debounce = setTimeout(run, 160)
  }
  onDestroy(() => clearTimeout(debounce))

  async function copy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    toast('Copied to clipboard')
  }
  function clearAll() { input = ''; output = ''; error = ''; onOutput('', false) }
  function swap() { if (output && !error) input = output }
</script>

<div class="tool-grid">
  <div class="pane">
    <div class="pane-head">
      <span class="pane-title">Input</span>
      <span class="pane-actions">
        <button class="btn-ghost btn btn-sm" onclick={clearAll}>Clear</button>
      </span>
    </div>
    <textarea
      class="input editor mono"
      bind:value={input}
      oninput={schedule}
      placeholder="Paste or type here…"
      spellcheck="false"
      aria-label="Input text"
    ></textarea>
  </div>

  <div class="middle">
    {#each tool.options as opt (opt.key)}
      {#if opt.type === 'select'}
        <label class="opt"><span class="dim">{opt.label}</span>
          <select class="input" bind:value={opts[opt.key] as string} onchange={schedule}>
            {#each opt.options ?? [] as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
          </select>
        </label>
      {:else}
        <label class="opt check"><input type="checkbox" bind:checked={opts[opt.key] as boolean} onchange={schedule} />
          <span>{opt.label}</span>
        </label>
      {/if}
    {/each}
    <button class="icon-btn swap" onclick={swap} title="Use output as input" aria-label="Use output as input">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>
    </button>
  </div>

  <div class="pane">
    <div class="pane-head">
      <span class="pane-title">Output {#if busy}<span class="spinner"></span>{/if}</span>
      <span class="pane-actions">
        <button class="btn-ghost btn btn-sm" onclick={copy} disabled={!output}>Copy</button>
      </span>
    </div>
    {#if error}
      <div class="error-box mono" role="alert">
        <strong>Error</strong>
        <span>{error}</span>
      </div>
    {:else}
      <textarea class="input editor mono" value={output} readonly placeholder="Result appears here…" aria-label="Output text"></textarea>
    {/if}
  </div>
</div>

<style>
  .tool-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: .6rem; height: 100%; min-height: 0; }
  .pane { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  .pane-head { display: flex; justify-content: space-between; align-items: center; padding: .15rem .1rem .4rem; }
  .pane-title { font-size: .78rem; font-weight: 600; color: var(--fg-dim); text-transform: uppercase; letter-spacing: .07em; display: flex; align-items: center; gap: .4rem; }
  .editor { flex: 1; resize: none; line-height: 1.55; font-size: .82rem; tab-size: 2; }
  .middle { display: flex; flex-direction: column; gap: .45rem; align-items: stretch; justify-content: center; padding: 0 .1rem; }
  .opt { display: flex; flex-direction: column; gap: .25rem; font-size: .78rem; min-width: 150px; }
  .opt.check { flex-direction: row; align-items: center; gap: .4rem; }
  .swap { align-self: center; margin-top: .25rem; }
  .error-box {
    flex: 1; border: 1px solid var(--danger); background: var(--danger-soft); color: var(--danger);
    border-radius: var(--radius-sm); padding: .7rem .8rem; display: flex; flex-direction: column; gap: .4rem;
    font-size: .8rem; white-space: pre-wrap; word-break: break-word;
  }
  @media (max-width: 860px) {
    .tool-grid { grid-template-columns: 1fr; grid-auto-rows: minmax(140px, 1fr); }
    .middle { flex-direction: row; flex-wrap: wrap; }
  }
</style>
