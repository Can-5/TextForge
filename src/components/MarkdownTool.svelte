<script lang="ts">
  import { renderMarkdown } from '../lib/markdown'

  let source = $state('# Welcome to TextForge\n\n**Everything here runs offline** — your text never leaves this machine.\n\n- Fenced `code` blocks\n- [Links](https://example.com) with safe URLs only\n- Raw HTML is neutralised (example: <scr' + 'ipt>alert(1)</scr' + 'ipt> is shown as text)\n\n```ts\nconst answer = 42\n```\n')
  const html = $derived(renderMarkdown(source))

  async function copyHtml() {
    const { writeText } = navigator.clipboard
    await writeText(html)
  }
</script>

<div class="md-grid">
  <div class="pane">
    <div class="pane-head"><span class="pane-title">Markdown</span></div>
    <textarea class="input editor mono" bind:value={source} spellcheck="false" aria-label="Markdown source"></textarea>
  </div>
  <div class="pane">
    <div class="pane-head">
      <span class="pane-title">Preview</span>
      <button class="btn-ghost btn btn-sm" onclick={copyHtml}>Copy HTML</button>
    </div>
    <div class="preview" aria-label="Rendered markdown">{@html html}</div>
  </div>
</div>

<style>
  .md-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; height: 100%; min-height: 0; }
  .pane { display: flex; flex-direction: column; min-height: 0; }
  .pane-head { display: flex; justify-content: space-between; align-items: center; padding: .1rem .1rem .4rem; }
  .pane-title { font-size: .75rem; font-weight: 600; color: var(--fg-dim); text-transform: uppercase; letter-spacing: .07em; }
  .editor { flex: 1; resize: none; font-size: .82rem; line-height: 1.55; }
  .preview {
    flex: 1; overflow: auto; background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: .6rem 1rem; font-size: .9rem; line-height: 1.6;
  }
  .preview :global(h1), .preview :global(h2), .preview :global(h3) { line-height: 1.25; letter-spacing: -0.01em; margin: .9em 0 .4em; }
  .preview :global(h1:first-child), .preview :global(h2:first-child) { margin-top: .2em; }
  .preview :global(code) { font-family: var(--mono); font-size: .82em; background: var(--bg-inset); border-radius: 4px; padding: .1em .35em; }
  .preview :global(pre) { background: var(--bg-inset); border-radius: var(--radius-sm); padding: .7rem .8rem; overflow-x: auto; }
  .preview :global(pre code) { background: none; padding: 0; }
  .preview :global(blockquote) { border-left: 3px solid var(--border-strong); margin: .6em 0; padding: .1em 1em; color: var(--fg-dim); }
  .preview :global(a) { color: var(--accent); }
  .preview :global(img) { max-width: 100%; }
  .preview :global(hr) { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
  .preview :global(table) { border-collapse: collapse; }
  @media (max-width: 860px) { .md-grid { grid-template-columns: 1fr; grid-auto-rows: minmax(160px, 1fr); } }
</style>
