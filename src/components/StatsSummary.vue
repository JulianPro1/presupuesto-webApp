<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CalendarClock,
  HandCoins,
  Info,
} from 'lucide-vue-next';
import {
  $stats,
  $savings,
  $rates,
  $overduePayables,
  $byCategory,
} from '../stores/budgetStore';
import { formatUsd, formatVes, formatPct } from '../utils/formatters';
import BasePopover from '@/components/common/feedback/BasePopover.vue';

const stats = useStore($stats);
const savings = useStore($savings);
const rates = useStore($rates);
const overdue = useStore($overduePayables);
const byCategory = useStore($byCategory);

const barWidth = computed(() =>
  Math.min(Math.max(savings.value.projectedPct, 0), 100),
);
const negative = computed(() => savings.value.projectedUsd < 0);
const topCategory = computed(() => byCategory.value[0]?.category ?? null);

const pl = (n: number, word: string) => (n === 1 ? word : `${word}s`);
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <a
      href="/ingresos/List"
      class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow"
    >
      <p
        class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
      >
        <TrendingUp class="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        Ingresos
      </p>
      <p class="mt-1.5 text-lg font-bold text-emerald-600">
        {{ formatUsd(stats.incomeUsd) }}
      </p>
      <p class="mt-0.5 text-xs text-slate-500">
        ≈ {{ formatVes(stats.incomeVesBcv) }} a tasa BCV
      </p>
    </a>

    <a
      href="/gastos/List"
      class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-rose-200 hover:shadow"
    >
      <p
        class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
      >
        <TrendingDown class="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
        Gastos del mes
      </p>
      <p class="mt-1.5 text-lg font-bold text-rose-600">
        {{ formatUsd(stats.totalUsd) }}
      </p>
      <p class="mt-0.5 text-xs text-slate-500">
        {{ stats.count }} {{ pl(stats.count, 'gasto')
        }}<template v-if="topCategory"> · Top: {{ topCategory }}</template>
      </p>
    </a>

    <a
      href="/presupuestos"
      class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow"
    >
      <p
        class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
      >
        <PiggyBank class="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
        Remanente
        <BasePopover
          title="Desglose del remanente"
          total-label="Remanente"
          :total-value="formatUsd(savings.projectedUsd)"
          :total-class="negative ? 'text-rose-600' : 'text-teal-600'"
          :width="250"
        >
          <Info class="h-3 w-3 text-slate-400" aria-hidden="true" />
          <template #rows>
            <div class="flex items-center justify-between gap-4 text-[11.5px]">
              <span class="text-slate-500">Ingresos</span>
              <span class="font-semibold text-emerald-600">+ {{ formatUsd(savings.incomeUsd) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 text-[11.5px]">
              <span class="text-slate-500">
                Por cobrar<template v-if="savings.receivableCount"> ({{ savings.receivableCount }})</template>
              </span>
              <span class="font-semibold text-violet-600">+ {{ formatUsd(savings.receivableUsd) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 text-[11.5px]">
              <span class="text-slate-500">Gastos</span>
              <span class="font-semibold text-rose-600">− {{ formatUsd(savings.expensesUsd) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 text-[11.5px]">
              <span class="text-slate-500">
                Por pagar<template v-if="savings.payablesCount"> ({{ savings.payablesCount }})</template>
              </span>
              <span class="font-semibold text-amber-600">− {{ formatUsd(savings.payablesUsd) }}</span>
            </div>
          </template>
        </BasePopover>
      </p>
      <p
        class="mt-1.5 text-lg font-bold"
        :class="negative ? 'text-rose-600' : 'text-teal-600'"
      >
        {{ formatUsd(savings.projectedUsd) }}
      </p>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full transition-all"
          :class="negative ? 'bg-rose-500' : 'bg-teal-500'"
          :style="{ width: `${barWidth}%` }"
        />
      </div>
      <p class="mt-1 text-[10px] text-slate-500">
        {{ formatPct(savings.projectedPct) }} del ingreso ·
        {{ formatVes(savings.projectedUsd * rates.bcv) }} a BCV
      </p>
    </a>

    <a
      href="/por-pagar/List"
      class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-200 hover:shadow"
    >
      <p
        class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
      >
        <CalendarClock class="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
        Por pagar
      </p>
      <p class="mt-1.5 text-lg font-bold text-amber-600">
        {{ formatUsd(stats.pendingUsd) }}
      </p>
      <p class="mt-0.5 text-xs text-slate-500">
        {{ stats.pendingCount }} {{ pl(stats.pendingCount, 'pendiente') }}
        <span v-if="overdue.count" class="font-semibold text-rose-600">
          · {{ overdue.count }} {{ pl(overdue.count, 'vencida') }}
        </span>
      </p>
    </a>

    <a
      href="/por-cobrar/List"
      class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow"
    >
      <p
        class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
      >
        <HandCoins class="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Por cobrar
      </p>
      <p class="mt-1.5 text-lg font-bold text-violet-600">
        {{ formatUsd(stats.receivableUsd) }}
      </p>
      <p class="mt-0.5 text-xs text-slate-500">
        {{ stats.receivableCount }}
        {{ pl(stats.receivableCount, 'pendiente') }}
      </p>
    </a>
  </section>
</template>
