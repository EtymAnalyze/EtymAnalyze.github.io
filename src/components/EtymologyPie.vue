<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  byWord: { type: Object, required: true }
})

const chartData = computed(() => {
  const counts = new Map()
  const colorByLang = new Map()

  for (const entry of Object.values(props.byWord)) {
    counts.set(entry.originLanguage, (counts.get(entry.originLanguage) || 0) + 1)
    colorByLang.set(entry.originLanguage, entry.color)
  }

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])

  return {
    labels: entries.map(([lang]) => lang),
    datasets: [
      {
        data: entries.map(([, n]) => n),
        backgroundColor: entries.map(([lang]) => colorByLang.get(lang)),
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 12, boxHeight: 12, padding: 10 }
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          const pct = ((ctx.parsed / total) * 100).toFixed(1)
          return `${ctx.label}: ${ctx.parsed} (${pct}%)`
        }
      }
    }
  }
}
</script>

<template>
  <div class="pie-wrap">
    <Pie v-if="Object.keys(byWord).length" :data="chartData" :options="chartOptions" />
    <p v-else class="empty">No data yet — start typing above.</p>
  </div>
</template>

<style scoped>
.pie-wrap { max-width: 320px; margin: 0 auto; }
.empty { color: #999; font-size: 0.9rem; text-align: center; }
</style>