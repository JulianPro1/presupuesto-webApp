<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  PiggyBank,
  Banknote,
  HandCoins,
  Receipt,
  CalendarClock,
  TrendingUp,
} from 'lucide-vue-next';
import { $rates, $savings } from '../stores/budgetStore';
import { formatUsd, formatVes, formatPct } from '../utils/formatters';

const savings = useStore($savings);
const rates = useStore($rates);

const barWidth = computed(() =>
  Math.min(Math.max(savings.value.savingsRate, 0), 100),
);
const negative = computed(() => savings.value.projectedUsd < 0);
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-3">
    <!-- Desglose principal -->
    <article
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
    >
      <h2
        class="flex items-center gap-2 text-sm font-bold text-slate-900"
      >
        <PiggyBank class="h-4 w-4 text-emerald-600" aria-hidden="true" />
        Saldo a favor
      </h2>
      <p class="mt-0.5 text-xs text-slate-500">
        Cuánto estás ahorrando con lo que entra y lo que comprometiste.
      </p>

      <dl class="mt-4 divide-y divide-slate-100 text-sm">
        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="flex items-center gap-2 font-medium text-slate-600">
            <Banknote class="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Ingresos registrados
          </dt>
          <dd class="font-semibold whitespace-nowrap text-emerald-600">
            + {{ formatUsd(savings.incomeUsd) }}
          </dd>
        </div>

        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="flex items-center gap-2 font-medium text-slate-600">
            <HandCoins class="h-4 w-4 text-violet-600" aria-hidden="true" />
            Por cobrar (pendiente)
          </dt>
          <dd class="font-semibold whitespace-nowrap text-violet-600">
            + {{ formatUsd(savings.receivableUsd) }}
          </dd>
        </div>

        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="flex items-center gap-2 font-medium text-slate-600">
            <Receipt class="h-4 w-4 text-rose-600" aria-hidden="true" />
            Gastos registrados
          </dt>
          <dd class="font-semibold whitespace-nowrap text-rose-600">
            − {{ formatUsd(savings.expensesUsd) }}
          </dd>
        </div>

        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="flex items-center gap-2 font-medium text-slate-600">
            <CalendarClock class="h-4 w-4 text-amber-500" aria-hidden="true" />
            Por pagar (pendiente)
          </dt>
          <dd class="font-semibold whitespace-nowrap text-amber-600">
            − {{ formatUsd(savings.payablesUsd) }}
          </dd>
        </div>

        <div class="flex items-center justify-between gap-4 py-3">
          <dt class="text-sm font-bold text-slate-900">
            Saldo proyectado
          </dt>
          <dd
            class="text-xl font-extrabold whitespace-nowrap"
            :class="negative ? 'text-rose-600' : 'text-emerald-600'"
          >
            {{ formatUsd(savings.projectedUsd) }}
          </dd>
        </div>
      </dl>

      <p
        v-if="rates.bcv > 0"
        class="border-t border-slate-100 pt-3 text-xs text-slate-500"
      >
        ≈ {{ formatVes(savings.projectedUsd * rates.bcv) }} a tasa BCV ·
        {{ formatVes(savings.projectedUsd * rates.usdt) }} a tasa USDT
      </p>
    </article>

    <!-- Ahorro actual -->
    <article
      class="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-5 text-white shadow-sm"
    >
      <div>
        <p
          class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-300 uppercase"
        >
          <TrendingUp class="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Ahorro actual
        </p>
        <p class="mt-2 text-3xl font-extrabold tracking-tight">
          {{ formatUsd(savings.netUsd) }}
        </p>
        <p class="mt-1 text-xs text-slate-400">
          Ingresos − gastos (sin contar pendientes)
        </p>
      </div>

      <div class="mt-5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-300">Tasa de ahorro</span>
          <span
            class="font-bold"
            :class="savings.savingsRate >= 0 ? 'text-emerald-300' : 'text-rose-300'"
          >
            {{ formatPct(savings.savingsRate) }}
          </span>
        </div>
        <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            class="h-full rounded-full transition-all"
            :class="savings.savingsRate >= 0 ? 'bg-emerald-400' : 'bg-rose-400'"
            :style="{ width: `${barWidth}%` }"
          />
        </div>
      </div>
    </article>
  </section>
</template>
