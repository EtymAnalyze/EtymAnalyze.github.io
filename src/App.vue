<script setup>
import { computed, ref, watch } from 'vue'
import EtymologyText from './components/EtymologyText.vue'
import EtymologyPie from './components/EtymologyPie.vue'
import { useEtymology } from './composables/useEtymology'

const { loading, error, byWord, notWords, noData, retrying, exhausted, analyze } =
  useEtymology()

const rawText = ref('Type a sentence and discover its etymology')
let debounceTimer = null

watch(rawText, (newText) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const words = newText
      .split(/\s+/)
      .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
      .filter(Boolean)
    if (words.length) analyze(words)
  }, 400)
}, { immediate: true })

const legend = computed(() => {
  const seen = new Map()
  for (const entry of Object.values(byWord.value)) {
    if (!seen.has(entry.originLanguage)) {
      seen.set(entry.originLanguage, entry.color)
    }
  }
  return [...seen.entries()].map(([language, color]) => ({ language, color }))
})

const notWordList = computed(() => Object.keys(notWords.value))
const noDataList = computed(() => Object.keys(noData.value))
const retryingList = computed(() => Object.keys(retrying.value))
const exhaustedList = computed(() => Object.keys(exhausted.value))
const hasStatus = computed(
  () =>
    notWordList.value.length ||
    noDataList.value.length ||
    retryingList.value.length ||
    exhaustedList.value.length
)
</script>

<template>
  <div class="app">
    <header>
      <h1>Etymology Visualizer</h1>
      <p class="subtitle">
        Type or paste text. Each word is tinted by the language it most anciently
        came from. Hover a word to see its full etymology.
      </p>
    </header>

    <textarea
      v-model="rawText"
      rows="3"
      class="main-input"
      placeholder="Type a sentence and discover its etymology..."
    ></textarea>

    <div v-if="error" class="error">Error: {{ error }}</div>

    <div class="output-grid">
      <section class="text-panel">
        <h2>Annotated text</h2>
        <EtymologyText
          :by-word="byWord"
          :not-words="notWords"
          :no-data="noData"
          :retrying="retrying"
          :exhausted="exhausted"
          :raw-text="rawText"
        />

        <div v-if="hasStatus" class="status">
          <p v-if="retryingList.length" class="status-line retrying">
            <span class="dot"></span>
            Waiting on etymology for {{ retryingList.length }}
            word{{ retryingList.length === 1 ? '' : 's' }} (retrying with backoff)…
          </p>
          <p v-if="exhaustedList.length" class="status-line exhausted">
            Gave up after retries: {{ exhaustedList.join(', ') }}
          </p>
          <p v-if="noDataList.length" class="status-line no-data">
            No etymology available: {{ noDataList.join(', ') }}
          </p>
          <p v-if="notWordList.length" class="status-line unknown-line">
            Not a word: {{ notWordList.join(', ') }}
          </p>
        </div>

        <div v-if="legend.length" class="legend">
          <span v-for="item in legend" :key="item.language" class="legend-item">
            <span class="swatch" :style="{ background: item.color }"></span>
            {{ item.language }}
          </span>
        </div>
      </section>

      <section class="chart-panel">
        <h2>Language breakdown</h2>
        <EtymologyPie :by-word="byWord" />
      </section>
    </div>
  </div>
</template>

<style>
:root {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #2b2b2b;
  background: #fafafa;
}
body { margin: 0; }
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}
header h1 { margin: 0 0 0.25rem; font-size: 1.8rem; }
.subtitle { color: #666; margin: 0 0 1.5rem; }

.main-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  outline: none;
  background: #fff;
}
.main-input:focus {
  border-color: #b9c3ff;
  box-shadow: 0 0 0 3px rgba(150, 160, 255, 0.15);
}

.error {
  background: #fee;
  color: #a00;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.output-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: start;
}
@media (max-width: 800px) {
  .output-grid { grid-template-columns: 1fr; }
}
.text-panel, .chart-panel {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}
h2 {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  margin: 0 0 1rem;
}

.status {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}
.status-line { margin: 0; }
.retrying { color: #364; display: flex; align-items: center; gap: 0.5rem; }
.retrying .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5a7;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.exhausted { color: #a44; }
.no-data { color: #665; }
.unknown-line { color: #a66; }

.legend {
  margin-top: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-size: 0.9rem;
}
.legend-item { display: inline-flex; align-items: center; gap: 0.4rem; }
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
</style>