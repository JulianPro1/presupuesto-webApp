<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  Banknote,
  PiggyBank,
  Receipt,
  CalendarClock,
  HandCoins,
} from 'lucide-vue-next';
import {
  $stats,
  $overduePayables,
  $byCategory,
} from '../stores/budgetStore';
import { formatUsd, formatVes, formatPct } from '../utils/formatters';

const stats = useStore($stats);
const overdue = useStore($overduePayables);
const byCategory = useStore($byCategory);

const barWidth = computed(() =>
  Math.min(Math.max(stats.value.pctFree, 0), 100),
);
const negative = computed(() => stats.value.remainingUsd < 0);
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
        <Banknote class="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
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
        <Receipt class="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
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
      href="/saldo-a-favor"
      class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow"
    >
      <p
        class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
      >
        <PiggyBank class="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
        Remanente
      </p>
      <p
        class="mt-1.5 text-lg font-bold"
        :class="negative ? 'text-rose-600' : 'text-teal-600'"
      >
        {{ formatUsd(stats.remainingUsd) }}
      </p>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full transition-all"
          :class="negative ? 'bg-rose-500' : 'bg-teal-500'"
          :style="{ width: `${barWidth}%` }"
        />
      </div>
      <p class="mt-1 text-[10px] text-slate-500">
        {{ formatPct(stats.pctFree) }} disponible ·
        {{ formatVes(stats.remainingVesBcv) }} a BCV
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
