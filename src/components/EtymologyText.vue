<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  byWord: { type: Object, required: true },
  notWords: { type: Object, default: () => ({}) },
  noData: { type: Object, default: () => ({}) },
  retrying: { type: Object, default: () => ({}) },
  exhausted: { type: Object, default: () => ({}) },
  rawText: { type: String, default: '' }
})

const tokens = computed(() => {
  const parts = props.rawText.split(/(\s+)/)
  return parts.map((part) => {
    if (/^\s+$/.test(part) || !part) return { type: 'space', value: part }

    const stripped = part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    if (!stripped) return { type: 'punct', value: part }

    const key = stripped.toLowerCase()
    const match = props.byWord[key]

    let status = 'unknown'
    if (match) status = 'resolved'
    else if (props.notWords[key]) status = 'not-a-word'
    else if (props.noData[key]) status = 'no-data'
    else if (props.retrying[key]) status = 'retrying'
    else if (props.exhausted[key]) status = 'exhausted'

    return { type: 'word', value: part, key, match, status }
  })
})

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  word: '',
  fullText: '',
  chain: []
})

function showTooltip(evt, token) {
  if (token.status !== 'resolved') return
  const rect = evt.currentTarget.getBoundingClientRect()
  tooltip.value = {
    visible: true,
    x: rect.left + rect.width / 2,
    y: rect.top,
    word: token.match.word,
    fullText: token.match.fullText,
    chain: token.match.languageChain
  }
}
function hideTooltip() {
  tooltip.value.visible = false
}
</script>

<template>
  <div class="annotated">
    <template v-for="(tok, i) in tokens" :key="i">
      <span v-if="tok.type === 'space'" class="space">{{ tok.value }}</span>
      <span
        v-else-if="tok.type === 'word'"
        class="word"
        :class="`status-${tok.status}`"
        :style="tok.match ? { backgroundColor: tok.match.color } : {}"
        @mouseenter="showTooltip($event, tok)"
        @mouseleave="hideTooltip"
      >{{ tok.value }}</span>
      <span v-else class="punct">{{ tok.value }}</span>
    </template>

    <Teleport to="body">
      <div
        v-if="tooltip.visible"
        class="tooltip"
        :style="{
          left: tooltip.x + 'px',
          top: tooltip.y - 8 + 'px'
        }"
      >
        <div class="tooltip-title">
          {{ tooltip.word }}
          <span v-if="tooltip.chain.length" class="chain">
            {{ tooltip.chain.join(' → ') }}
          </span>
        </div>
        <div class="tooltip-body">
          {{ tooltip.fullText || 'No etymology text.' }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.annotated {
  font-size: 1.15rem;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}

.word {
  border-radius: 4px;
  padding: 0.05em 0.15em;
  cursor: help;
  transition: filter 0.12s;
}
.word:hover {
  filter: brightness(0.93);
}

/* Resolved words: color supplied inline via :style */

/* Unknown words: no background color, just subtle affordance */
.status-unknown {
  color: #333;
  text-decoration: underline dotted #c8c8c8;
  text-underline-offset: 3px;
}
.status-not-a-word {
  color: #666;
  text-decoration: underline dotted #c8c8c8;
  text-underline-offset: 3px;
}
.status-no-data {
  color: #665;
  text-decoration: underline dotted #c9bfe0;
  text-underline-offset: 3px;
}

/* Transient/terminal states: keep a background so they read as "pending" */
.status-retrying {
  background: repeating-linear-gradient(
    -45deg,
    #eef3ff,
    #eef3ff 6px,
    #dfe8ff 6px,
    #dfe8ff 12px
  );
  color: #364;
  animation: pulse 1.6s ease-in-out infinite;
}
.status-exhausted {
  background: #ffecec;
  color: #a44;
  text-decoration: underline dotted #d99;
  text-underline-offset: 3px;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.space { white-space: pre; }

.tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  max-width: 380px;
  background: #1f2430;
  color: #f5f6f8;
  padding: 0.75rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 1000;
}
.tooltip::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1f2430;
}
.tooltip-title {
  font-weight: 600;
  margin-bottom: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
}
.chain {
  font-weight: 400;
  font-size: 0.8em;
  color: #b7c0d8;
}
.tooltip-body {
  color: #d9dde6;
  max-height: 240px;
  overflow: auto;
}
</style>