import { ref } from 'vue'

const languageColors = new Map()

function colorForLanguage(language) {
  if (!language || language === 'Unknown') return '#cccccc';
  
  // Create a consistent hash for the language name
  let hash = 0;
  for (let i = 0; i < language.length; i++) {
    hash = language.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate HSL color with constrained lightness and saturation
  const hue = Math.abs(hash) % 360; // Full hue range
  const saturation = 70 + Math.abs(hash) % 30; // 70-100% saturation
  const lightness = 75 + Math.abs(hash) % 15; // 75-90% lightness

  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  if (!languageColors.has(language)) {
    languageColors.set(language, color);
  }
  
  return color;
}

function cleanEtymology(raw) {
  if (!raw) return ''
  return raw
    .replace(/\{it\}([\s\S]*?)\{\/it\}/g, '$1')
    .replace(/\{mat\|([\s\S]*?)\|\}/g, '$1')
    .replace(/\{ma\}/g, '')
    .replace(/\{\/ma\}/g, '')
    .trim()
}

function interpret(word, value) {
  if (value === 'Not a Word' || value == null) {
    return { state: 'not-a-word', word }
  }
  if (value === 'No etymology data found') {
    return { state: 'no-data', word }
  }
  if (value === 'Retry Later') {
    return { state: 'retry-later', word }
  }
  const chain = value.languageChain || []
  const origin = chain.length ? chain[chain.length - 1] : 'Unknown'
  return {
    state: 'resolved',
    word,
    entry: {
      word,
      languageChain: chain,
      fullText: cleanEtymology(value.fullText),
      originLanguage: origin,
      color: colorForLanguage(origin)
    }
  }
}

const MAX_ATTEMPTS = 10
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000

export function useEtymology() {
  const loading = ref(false)
  const error = ref(null)

  // Plain objects give us idiomatic Vue reactivity.
  const byWord = ref({})     // key -> resolved entry
  const notWords = ref({})   // key -> true
  const noData = ref({})     // key -> true
  const retrying = ref({})   // key -> true
  const exhausted = ref({})  // key -> true

  const retryState = new Map() // non-reactive retry bookkeeping
  let retryTimer = null
  let inFlight = 0

  function beginRequest() { inFlight++; loading.value = inFlight > 0 }
  function endRequest() { inFlight = Math.max(0, inFlight - 1); loading.value = inFlight > 0 }

  async function postWords(words) {
    beginRequest()
    try {
      const res = await fetch('https://pkuj506kcg.execute-api.us-west-2.amazonaws.com/default/ServeEtymologiesLambda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words })
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      return await res.json()
    } finally {
      endRequest()
    }
  }

  function syncRetrying() {
    const next = {}
    for (const key of retryState.keys()) {
      if (!exhausted.value[key]) next[key] = true
    }
    retrying.value = next
  }

  async function sendAndApply(words) {
    if (!words.length) return []
    const data = await postWords(words)
    const retryAgain = []

    for (const word of words) {
      const key = word.toLowerCase()
      const value = data[word] ?? data[key]
      const result = interpret(word, value)

      if (result.state === 'not-a-word') {
        notWords.value[key] = true
        retryState.delete(key)
        delete retrying.value[key]
      } else if (result.state === 'no-data') {
        noData.value[key] = true
        retryState.delete(key)
        delete retrying.value[key]
      } else if (result.state === 'retry-later') {
        retryAgain.push(word)
      } else {
        byWord.value[key] = result.entry
        retryState.delete(key)
        delete retrying.value[key]
      }
    }

    return retryAgain
  }

  function scheduleRetry(retryWords) {
    const now = Date.now()
    let soonest = Infinity

    for (const word of retryWords) {
      const key = word.toLowerCase()
      const st = retryState.get(key) || { attempts: 0, originalCasing: word }
      st.attempts += 1
      st.originalCasing = st.originalCasing || word

      if (st.attempts >= MAX_ATTEMPTS) {
        exhausted.value[key] = true
        retryState.delete(key)
        continue
      }

      const delay = Math.min(BASE_DELAY_MS * 2 ** (st.attempts - 1), MAX_DELAY_MS)
      st.nextEligibleAt = now + delay
      retryState.set(key, st)
      soonest = Math.min(soonest, delay)
    }

    syncRetrying()
    if (retryState.size === 0) return
    if (retryTimer) return
    retryTimer = setTimeout(runRetryBatch, soonest === Infinity ? BASE_DELAY_MS : soonest)
  }

  async function runRetryBatch() {
    retryTimer = null
    const now = Date.now()
    const eligible = []
    for (const [key, st] of retryState) {
      if (st.nextEligibleAt <= now) eligible.push(st.originalCasing || key)
    }

    if (!eligible.length) {
      let soonest = Infinity
      for (const st of retryState.values()) {
        soonest = Math.min(soonest, Math.max(0, st.nextEligibleAt - now))
      }
      if (retryState.size) retryTimer = setTimeout(runRetryBatch, soonest)
      return
    }

    let retryAgain = []
    try {
      retryAgain = await sendAndApply(eligible)
    } catch (e) {
      retryAgain = eligible
    }

    if (retryAgain.length) scheduleRetry(retryAgain)
  }

  async function analyze(words) {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
    retryState.clear()
    byWord.value = {}
    notWords.value = {}
    noData.value = {}
    retrying.value = {}
    exhausted.value = {}
    error.value = null

    const seen = new Map()
    for (const w of words) {
      const key = w.toLowerCase()
      if (!seen.has(key)) seen.set(key, w)
    }
    const unique = [...seen.values()]

    try {
      const retryWords = await sendAndApply(unique)
      if (retryWords.length) scheduleRetry(retryWords)
    } catch (e) {
      error.value = e.message || String(e)
    }
  }

  return {
    loading, error, byWord, notWords, noData, retrying, exhausted, analyze
  }
}