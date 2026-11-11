<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '@nanostores/vue';
import { Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { ChartPie } from 'lucide-vue-next';
import { $byCategory } from '../stores/budgetStore';
import { formatUsd } from '../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#64748b',
];

const byCategory = useStore($byCategory);

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: byCategory.value.map((c) => c.category),
  datasets: [
    {
      data: byCategory.value.map((c) => Math.round(c.totalUsd * 100) / 100),
      backgroundColor: byCategory.value.map(
        (_, i) => PALETTE[i % PALETTE.length],
      ),
      borderColor: '#ffffff',
      borderWidth: 2,
    },
  ],
}));

const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        color: '#475569',
        font: { size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${formatUsd(Number(ctx.parsed))}`,
      },
    },
  },
};
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <h2 class="flex items-center gap-2 text-base font-bold text-slate-900">
      <ChartPie class="h-5 w-5 text-sky-600" aria-hidden="true" />
      Distribución por categoría
    </h2>

    <div
      v-if="byCategory.length === 0"
      class="mt-4 flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 text-slate-400"
    >
      <ChartPie class="h-10 w-10" aria-hidden="true" />
      <p class="text-sm">Registra gastos para ver la distribución</p>
    </div>

    <div v-else class="relative mt-4 h-72">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
  </section>
</template>
