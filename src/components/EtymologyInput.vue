<script setup>
import { ref } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['analyze'])

const text = ref('')

function submit() {
  const words = text.value
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)

  if (words.length) emit('analyze', words)
}
</script>

<template>
  <div class="input-card">
    <textarea
      v-model="text"
      rows="5"
      placeholder="Type or paste a block of text here, then click Analyze…"
    ></textarea>
    <div class="actions">
      <button :disabled="loading || !text.trim()" @click="submit">
        {{ loading ? 'Analyzing…' : 'Analyze' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.input-card {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
}
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  outline: none;
}
textarea:focus { border-color: #b9c3ff; box-shadow: 0 0 0 3px rgba(150,160,255,0.15); }
.actions { display: flex; justify-content: flex-end; margin-top: 0.75rem; }
button {
  background: #4f5bd5;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.4rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s;
}
button:hover:not(:disabled) { background: #3f4ac0; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
</style>