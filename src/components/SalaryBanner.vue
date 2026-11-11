<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  Wallet,
  Landmark,
  ArrowLeftRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-vue-next';
import {
  $rates,
  $ratesMeta,
  $ratesStatus,
  $spreadPct,
  $stats,
  $totalIncome,
} from '../stores/budgetStore';
import { syncRates, startUsdtStream } from '../utils/ratesApi';
import { formatUsd, formatVes, formatPct } from '../utils/formatters';
import { useDateFormat } from '@/composables/ui/useDateFormat';
import { useSwalToast } from '@/composables/ui/useSwalToast';
import RatesModal from '@/components/RatesModal.vue';

const { formatDateFriendly } = useDateFormat();
const { showSuccess, showInfo, showError } = useSwalToast();

const income = useStore($totalIncome);
const stats = useStore($stats);
const rates = useStore($rates);
const meta = useStore($ratesMeta);
const status = useStore($ratesStatus);
const spread = useStore($spreadPct);

const showRatesModal = ref(false);

const loading = computed(() => status.value === 'loading');
const usdtLive = computed(() => status.value === 'live');

let stopUsdt: (() => void) | null = null;

async function refresh(notify = false) {
  const ok = await syncRates();
  if (!notify) return;
  if (ok.bcv && ok.usdt) {
    showSuccess('Tasas BCV y USDT actualizadas desde DolarVZLA');
  } else if (ok.bcv) {
    showInfo('Tasa BCV actualizada (USDT sigue por stream en vivo)');
  } else {
    showError('No se pudo contactar a DolarVZLA');
  }
}

onMounted(() => {
  void refresh();
  stopUsdt = startUsdtStream();
});

onBeforeUnmount(() => {
  stopUsdt?.();
});
</script>

<template>
  <section
    class="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 p-5 text-white shadow-sm sm:p-6"
  >
    <div
      class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"
    >
      <p class="text-xs text-slate-200">
        Fuente: DolarVZLA
      </p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/20 disabled:opacity-50"
          @click="refresh(true)"
        >
          <RefreshCw
            class="h-3.5 w-3.5"
            :class="{ 'animate-spin': loading }"
            aria-hidden="true"
          />
          Actualizar Tasas
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/20"
          @click="showRatesModal = true"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" aria-hidden="true" />
          Agregar tasas manualmente
        </button>
      </div>
    </div>

    <div
      class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
    >
      <div class="min-w-56">
        <span
          class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-100 uppercase"
        >
          <Wallet class="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Ingresos del mes (USDT)
        </span>
        <p class="text-3xl font-extrabold tracking-tight text-white">
          {{ formatUsd(income.usd) }}
        </p>
        <p class="mt-1 text-xs text-slate-200">
          Ingresos registrados este mes
        </p>
      </div>

      <div class="grid flex-1 gap-4 sm:grid-cols-3 lg:max-w-3xl">
        <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
          <p
            class="flex items-center gap-1.5 text-xs font-medium text-slate-100"
          >
            <Landmark class="h-4 w-4 text-sky-400" aria-hidden="true" />
            En comercios (BCV)
          </p>
          <p class="mt-1 text-xl font-bold text-sky-300">
            {{ formatVes(income.vesBcv) }}
          </p>
          <p class="mt-0.5 text-xs text-slate-200">
            Tasa: {{ formatVes(rates.bcv) }}/$
            <template v-if="meta.bcvDate">· {{ formatDateFriendly(meta.bcvDate) }}</template>
          </p>
        </div>

        <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
          <p
            class="flex items-center gap-1.5 text-xs font-medium text-slate-100"
          >
            <ArrowLeftRight
              class="h-4 w-4 text-emerald-400"
              aria-hidden="true"
            />
            En mercado P2P (USDT)
            <span
              v-if="usdtLive"
              title="Stream de DolarVZLA conectado"
              class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
            />
          </p>
          <p class="mt-1 text-xl font-bold text-emerald-300">
            {{ formatVes(income.vesUsdt) }}
          </p>
          <p class="mt-0.5 text-xs text-slate-200">
            Tasa: {{ formatVes(rates.usdt) }}/$
          </p>
        </div>

        <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
          <p class="text-xs font-medium text-slate-100">
            Brecha en tus gastos
          </p>
          <p class="mt-1 text-xl font-bold text-amber-300">
            {{ formatVes(stats.gapVes) }}
          </p>
          <p class="mt-0.5 text-xs text-slate-200">
            ≈ {{ formatUsd(stats.gapUsd) }} · brecha actual
            {{ spread > 0 ? '+' : '' }}{{ formatPct(spread) }}
          </p>
        </div>
      </div>
    </div>

    <RatesModal :open="showRatesModal" @close="showRatesModal = false" />
  </section>
</template>
