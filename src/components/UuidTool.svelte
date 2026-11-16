<script lang="ts">
  import { generateUuids } from '../lib/textTools'

  interface Props {
    toast: (msg: string) => void
    onOutput: (text: string, copyable: boolean) => void
  }
  let { toast, onOutput }: Props = $props()

  let count = $state('1')
  let uppercase = $state(false)
  let noHyphens = $state(false)
  let output = $state(generateUuids(1, {}))

  function generate() {
    output = generateUuids(Number(count), { uppercase, noHyphens })
    onOutput(output, true)
  }
  async function copy() {
    await navigator.clipboard.writeText(output)
    toast('Copied to clipboard')
  }
  $effect(() => { onOutput(output, true) })
</script>

<div class="uuid-wrap">
  <div class="controls card">
    <label class="opt"><span class="dim">How many</span>
      <select class="input" bind:value={count}>
        {#each ['1', '5', '10', '25', '50'] as n (n)}<option value={n}>{n}</option>{/each}
      </select>
    </label>
    <label class="opt check"><input type="checkbox" bind:checked={uppercase} /> Uppercase</label>
    <label class="opt check"><input type="checkbox" bind:checked={noHyphens} /> No hyphens</label>
    <button class="btn" onclick={generate}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
      Generate
    </button>
    <button class="btn btn-ghost" onclick={copy}>Copy</button>
  </div>
  <textarea class="input editor mono" value={output} readonly aria-label="Generated UUIDs"></textarea>
  <p class="dim note">UUID v4 · random via <code>crypto.randomUUID()</code> · generated on this device</p>
</div>

<style>
  .uuid-wrap { display: flex; flex-direction: column; gap: .6rem; height: 100%; min-height: 0; }
  .controls { display: flex; align-items: center; gap: .8rem; padding: .7rem .8rem; flex-wrap: wrap; }
  .opt { display: flex; flex-direction: column; gap: .25rem; font-size: .8rem; }
  .opt.check { flex-direction: row; align-items: center; gap: .4rem; }
  .editor { flex: 1; resize: none; font-size: .85rem; line-height: 1.7; }
  .note { font-size: .75rem; margin: 0; }
</style>
