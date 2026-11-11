<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  Calculator,
  ArrowRightLeft,
  Landmark,
  CircleDollarSign,
  Check,
  Copy,
  Info,
  RotateCcw,
} from 'lucide-vue-next';
import { $rates, $ratesMeta } from '../stores/budgetStore';
import type { ExpenseCurrency } from '../stores/budgetStore';
import { formatUsd, formatVes, parseAmount } from '../utils/formatters';
import { useDateFormat } from '@/composables/ui/useDateFormat';
import { useSwalToast } from '@/composables/ui/useSwalToast';
import BaseInput from '@/components/BaseInput.vue';
import MultiselectCustom from '@/components/MultiselectCustom.vue';

type Currency = 'USDT' | 'USD' | 'VES';
type Accent = 'rose' | 'emerald' | 'amber' | 'violet';

const ACCENT_BTN: Record<Accent, string> = {
  rose: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
  amber: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
  violet: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800',
};

interface Props {
  inModal?: boolean;
  accent?: Accent;
}

withDefaults(defineProps<Props>(), {
  inModal: false,
  accent: 'emerald',
});

const emit = defineEmits<{
  (e: 'apply', payload: { value: number; currency: ExpenseCurrency }): void;
}>();

const CURRENCY_OPTIONS: Currency[] = ['USDT', 'USD', 'VES'];

/** En modo modal solo se puede aplicar a monedas que aceptan los formularios */
const MODAL_TO_OPTIONS: Currency[] = ['USDT', 'VES'];

const CURRENCY_LABELS: Record<Currency, string> = {
  USDT: 'USDT (P2P)',
  USD: 'Dólar BCV',
  VES: 'Bolívares',
};

const rates = useStore($rates);
const meta = useStore($ratesMeta);
const { formatDateFriendly } = useDateFormat();
const { showSuccess, showInfo } = useSwalToast();

const amountRaw = ref('1');
const from = ref<Currency>('USDT');
const to = ref<Currency>('VES');

const QUICK_AMOUNTS = [10, 50, 100, 500];

/** Tasa Bs. por unidad de cada moneda */
const unitRate: Record<Currency, number> = {
  get USDT() {
    return rates.value.usdt;
  },
  get USD() {
    return rates.value.bcv;
  },
  get VES() {
    return 1;
  },
};

const sameCurrency = computed(() => from.value === to.value);

const result = computed(() => {
  const amount = parseAmount(amountRaw.value);
  const rateFrom = unitRate[from.value];
  const rateTo = unitRate[to.value];
  if (amount <= 0 || rateFrom <= 0 || rateTo <= 0) return 0;
  // VES como unidad pivote: amount * (Bs/origen) / (Bs/destino)
  return (amount * rateFrom) / rateTo;
});

const effectiveRate = computed(() => {
  const rateFrom = unitRate[from.value];
  const rateTo = unitRate[to.value];
  if (rateFrom <= 0 || rateTo <= 0) return 0;
  return rateFrom / rateTo;
});

const missingRates = computed(
  () => (from.value !== 'VES' && unitRate[from.value] <= 0) ||
    (to.value !== 'VES' && unitRate[to.value] <= 0),
);

/** El resultado solo es aplicable a un registro si es válido y la moneda destino existe en los formularios */
const canApply = computed(
  () =>
    result.value > 0 &&
    !missingRates.value &&
    !sameCurrency.value &&
    to.value !== 'USD',
);

const copied = ref(false);

async function copyResult() {
  if (result.value <= 0 || sameCurrency.value) return;
  try {
    await navigator.clipboard.writeText(formatResult(result.value, to.value));
    copied.value = true;
    showSuccess('Resultado copiado al portapapeles');
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    showInfo('No se pudo acceder al portapapeles');
  }
}

function formatResult(value: number, currency: Currency): string {
  return currency === 'VES' ? formatVes(value) : formatUsd(value);
}

function formatRateValue(currency: Currency, value: number): string {
  return currency === 'VES' ? formatVes(value) : formatUsd(value);
}

function swap() {
  const tmp = from.value;
  from.value = to.value;
  to.value = tmp;
}

function apply() {
  if (!canApply.value) return;
  showSuccess(`Monto aplicado: ${formatResult(result.value, to.value)}`);
  emit('apply', {
    value: result.value,
    currency: to.value === 'VES' ? 'VES' : 'USDT',
  });
}

function reset() {
  amountRaw.value = '1';
  from.value = 'USDT';
  to.value = 'VES';
  showInfo('Calculadora restablecida');
}
</script>

<template>
  <section :class="inModal ? 'flex flex-col' : 'grid gap-4 lg:grid-cols-3'">
    <!-- Conversor -->
    <article
      :class="
        inModal
          ? ''
          : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2'
      "
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Calculator class="h-4 w-4 text-sky-600" aria-hidden="true" />
            Calculadora de divisas
          </h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Convierte entre USDT, dólar oficial (BCV) y bolívares con las
            tasas actuales.
          </p>
        </div>
        <button
          type="button"
          aria-label="Restablecer calculadora"
          title="Restablecer"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
          @click="reset"
        >
          <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
          Restablecer
        </button>
      </div>

      <div class="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <label class="mb-1 block text-sm font-semibold text-slate-700">
            De
          </label>
          <MultiselectCustom
            v-model="from"
            :options="inModal ? MODAL_TO_OPTIONS : CURRENCY_OPTIONS"
            :show-icons="false"
            :show-descriptions="false"
            :allow-empty="false"
            aria-label="Moneda de origen"
          />
        </div>

        <button
          type="button"
          aria-label="Invertir monedas"
          class="inline-flex h-10 w-10 items-center justify-center self-end rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-sky-600"
          @click="swap"
        >
          <ArrowRightLeft class="h-4 w-4" aria-hidden="true" />
        </button>

        <div>
          <label class="mb-1 block text-sm font-semibold text-slate-700">
            A
          </label>
          <MultiselectCustom
            v-model="to"
            :options="inModal ? MODAL_TO_OPTIONS : CURRENCY_OPTIONS"
            :show-icons="false"
            :show-descriptions="false"
            :allow-empty="false"
            aria-label="Moneda de destino"
          />
        </div>
      </div>

      <div class="mt-4">
        <BaseInput
          id="calculator-amount"
          v-model="amountRaw"
          type="currency"
          label="Cantidad"
          placeholder="0.00"
        />
        <div class="mt-2 flex flex-wrap gap-1.5">
          <button
            v-for="q in QUICK_AMOUNTS"
            :key="q"
            type="button"
            class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            :class="{
              'border-sky-300 bg-sky-50 text-sky-700':
                parseAmount(amountRaw) === q,
            }"
            @click="amountRaw = String(q)"
          >
            {{ q }}
          </button>
        </div>
      </div>

      <!-- Resultado -->
      <div
        class="mt-4 rounded-xl border p-4"
        :class="
          sameCurrency
            ? 'border-sky-100 bg-sky-50/60'
            : 'border-emerald-100 bg-emerald-50/60'
        "
      >
        <template v-if="sameCurrency">
          <p class="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <Info class="h-3.5 w-3.5" aria-hidden="true" />
            Elige dos monedas distintas para convertir.
          </p>
        </template>

        <template v-else>
          <p
            class="text-xs font-semibold tracking-wide text-slate-500 uppercase"
          >
            {{ CURRENCY_LABELS[from] }} → {{ CURRENCY_LABELS[to] }}
          </p>
          <div class="mt-1 flex items-center justify-between gap-2">
            <p
              class="truncate text-3xl font-extrabold tracking-tight text-emerald-700"
            >
              {{ formatResult(result, to) }}
            </p>
            <button
              type="button"
              :aria-label="copied ? 'Copiado' : 'Copiar resultado'"
              :title="copied ? 'Copiado' : 'Copiar resultado'"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50"
              @click="copyResult"
            >
              <Check v-if="copied" class="h-4 w-4" aria-hidden="true" />
              <Copy v-else class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p v-if="effectiveRate > 0" class="mt-1 text-xs text-slate-500">
            1 {{ from }} = {{ formatRateValue(to, effectiveRate) }}
            · 1 {{ to }} = {{ formatRateValue(from, 1 / effectiveRate) }}
          </p>
          <p
            v-if="missingRates"
            class="mt-1 text-xs font-semibold text-amber-600"
          >
            Aún no hay tasas cargadas — configúralas desde Analíticas →
            «Tasa manual».
          </p>
        </template>
      </div>

      <button
        v-if="inModal"
        type="button"
        :disabled="!canApply"
        class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        :class="ACCENT_BTN[accent]"
        @click="apply"
      >
        <Check class="h-4 w-4" aria-hidden="true" />
        Usar {{ formatResult(result, to) }} en el monto
      </button>
    </article>

    <!-- Tasas de referencia -->
    <article
      v-if="!inModal"
      class="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 p-5 text-white shadow-sm"
    >
      <p
        class="text-xs font-semibold tracking-wide text-slate-300 uppercase"
      >
        Tasas de referencia
      </p>

      <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
        <p class="flex items-center gap-1.5 text-xs text-slate-300">
          <Landmark class="h-4 w-4 text-sky-400" aria-hidden="true" />
          Dólar oficial BCV
        </p>
        <p class="mt-1 text-xl font-bold text-sky-300">
          {{ formatVes(rates.bcv) }}
        </p>
        <p v-if="meta.bcvDate" class="mt-0.5 text-xs text-slate-400">
          {{ formatDateFriendly(meta.bcvDate) }}
        </p>
      </div>

      <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
        <p class="flex items-center gap-1.5 text-xs text-slate-300">
          <CircleDollarSign
            class="h-4 w-4 text-emerald-400"
            aria-hidden="true"
          />
          USDT mercado P2P
        </p>
        <p class="mt-1 text-xl font-bold text-emerald-300">
          {{ formatVes(rates.usdt) }}
        </p>
      </div>
    </article>
  </section>
</template>
