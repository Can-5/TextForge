<script lang="ts">
  import { countText } from '../lib/textTools'

  let text = $state('')
  const stats = $derived(countText(text))
  const rows = $derived([
    { label: 'Words', value: stats.words },
    { label: 'Characters', value: stats.chars },
    { label: 'Characters (no spaces)', value: stats.charsNoSpaces },
    { label: 'Lines', value: stats.lines },
    { label: 'Paragraphs', value: stats.paragraphs },
    { label: 'Bytes (UTF-8)', value: stats.bytes },
    { label: 'Reading time', value: stats.words === 0 ? '—' : stats.readingTimeMin < 1 ? `${Math.ceil(stats.readingTimeMin * 60)}s` : `${stats.readingTimeMin.toFixed(1)} min` },
  ])
</script>

<div class="count-grid">
  <textarea class="input editor" bind:value={text} placeholder="Type or paste text…" spellcheck="false" aria-label="Text to count"></textarea>
  <div class="stats">
    {#each rows as row (row.label)}
      <div class="stat card">
        <div class="stat-value mono">{row.value}</div>
        <div class="stat-label dim">{row.label}</div>
      </div>
    {/each}
  </div>
</div>

<style>
  .count-grid { display: grid; grid-template-columns: 1fr 280px; gap: .7rem; height: 100%; min-height: 0; }
  .editor { resize: none; font-size: .95rem; line-height: 1.65; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; align-content: start; }
  .stat { padding: .7rem .8rem; }
  .stat-value { font-size: 1.35rem; font-weight: 650; letter-spacing: -0.01em; }
  .stat-label { font-size: .7rem; margin-top: .15rem; }
  @media (max-width: 900px) { .count-grid { grid-template-columns: 1fr; } .stats { grid-auto-flow: column; } }
</style>
