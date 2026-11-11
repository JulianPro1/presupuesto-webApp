<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from '@nanostores/vue';
import { navigate } from 'astro:transitions/client';
import { CirclePlus, Calculator } from 'lucide-vue-next';
import BaseInput from '@/components/BaseInput.vue';
import CalculatorModal from '@/components/CalculatorModal.vue';
import MultiselectCustom from '@/components/MultiselectCustom.vue';
import {
  $rates,
  addExpense,
  CATEGORIES,
  expenseContraValues,
  type Category,
  type ExpenseCurrency,
} from '../stores/budgetStore';
import { formatUsd, parseAmount, todayIso } from '../utils/formatters';
import { useSwalToast } from '@/composables/ui/useSwalToast';

interface Props {
  inModal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  inModal: false,
});

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

const rates = useStore($rates);
const { showSuccess, showError } = useSwalToast();

const description = ref('');
const category = ref<Category>('Alimentación');
const amountRaw = ref('');
const currency = ref<ExpenseCurrency>('USDT');
const date = ref(todayIso());

const showCalc = ref(false);

function applyCalc(payload: { value: number; currency: ExpenseCurrency }) {
  amountRaw.value = String(payload.value);
  currency.value = payload.currency;
  showCalc.value = false;
}

const descRules = [
  (v: string) => Boolean(String(v ?? '').trim()) || 'Ingresa una descripción',
];
const amountRules = [
  (v: string) => parseAmount(v) > 0 || 'Ingresa un monto mayor a cero',
];

function currencyBtnClass(c: ExpenseCurrency): string {
  if (currency.value === c) {
    return c === 'USDT'
      ? 'bg-emerald-600 text-white'
      : 'bg-sky-600 text-white';
  }
  return 'bg-slate-50 text-slate-500 hover:bg-slate-100';
}

function handleSubmit() {
  const amount = parseAmount(amountRaw.value);

  if (!description.value.trim()) {
    showError('Ingresa una descripción para el gasto');
    return;
  }
  if (amount <= 0) {
    showError('Ingresa un monto mayor a cero');
    return;
  }
  if (currency.value === 'VES' && rates.value.bcv <= 0) {
    showError('Configura la tasa BCV para registrar gastos en bolívares');
    return;
  }

  const expense = addExpense({
    description: description.value,
    category: category.value,
    amount,
    currency: currency.value,
    date: date.value || undefined,
  });
  showSuccess(`Gasto registrado: ${formatUsd(expenseContraValues(expense).usdUsdt)}`);
  description.value = '';
  amountRaw.value = '';
  date.value = todayIso();
  emit('success');
  if (!props.inModal) void navigate('/gastos/List');
}
</script>

<template>
  <component
    :is="inModal ? 'div' : 'section'"
    :class="inModal ? '' : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'"
  >
    <div v-if="!inModal" class="flex items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 text-base font-bold text-slate-900">
        <CirclePlus class="h-5 w-5 text-rose-600" aria-hidden="true" />
        Registrar gasto
      </h2>
      <button
        type="button"
        aria-label="Abrir calculadora"
        title="Abrir calculadora"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
        @click="showCalc = true"
      >
        <Calculator class="h-4 w-4" aria-hidden="true" />
        Calcular
      </button>
    </div>

    <form :class="inModal ? 'flex flex-col gap-4' : 'mt-4 flex flex-col gap-4'" @submit.prevent="handleSubmit">
      <BaseInput
        id="expense-description"
        v-model="description"
        type="text"
        label="Descripción"
        placeholder="Ej. Mercado semanal"
        :max-length="80"
        :rules="descRules"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <MultiselectCustom
          id="expense-category"
          v-model="category"
          :options="[...CATEGORIES]"
          label="Categoría"
          placeholder="Selecciona una categoría"
          :show-icons="false"
          :allow-empty="false"
        />

        <BaseInput
          id="expense-date"
          v-model="date"
          type="date"
          label="Fecha"
        />
      </div>

      <BaseInput
        id="expense-amount"
        v-model="amountRaw"
        type="currency"
        label="Monto"
        :placeholder="currency === 'USDT' ? '0.00' : '0,00'"
        :rules="amountRules"
      >
        <template #label-right>
          <div
            class="flex overflow-hidden rounded-lg border border-slate-200"
            role="group"
            aria-label="Moneda del monto"
          >
            <button
              v-for="c in ['USDT', 'VES'] as const"
              :key="c"
              type="button"
              :aria-pressed="currency === c"
              class="px-2.5 py-1 text-xs font-semibold transition"
              :class="currencyBtnClass(c)"
              @click="currency = c"
            >
              {{ c === 'USDT' ? '$ USDT' : 'Bs.' }}
            </button>
          </div>
        </template>
      </BaseInput>
      <p
        v-if="rates.bcv > 0 || rates.usdt > 0"
        class="-mt-3 text-xs text-slate-500"
      >
        Se guardará con snapshot de tasas y su equivalencia en $ BCV y $ USDT
      </p>

      <div v-if="inModal" class="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          @click="emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 active:bg-rose-800"
        >
          <CirclePlus class="h-4 w-4" aria-hidden="true" />
          Agregar gasto
        </button>
      </div>

      <button
        v-else
        type="submit"
        class="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 active:bg-rose-800"
      >
        <CirclePlus class="h-4 w-4" aria-hidden="true" />
        Agregar gasto
      </button>
    </form>

    <CalculatorModal
      :open="showCalc"
      accent="rose"
      @apply="applyCalc"
      @close="showCalc = false"
    />
  </component>
</template>
