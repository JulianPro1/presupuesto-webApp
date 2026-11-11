<script setup lang="ts">
import { ref } from 'vue';
import { navigate } from 'astro:transitions/client';
import { useStore } from '@nanostores/vue';
import { CalendarClock, Calculator } from 'lucide-vue-next';
import BaseInput from '@/components/BaseInput.vue';
import CalculatorModal from '@/components/CalculatorModal.vue';
import MultiselectCustom from '@/components/MultiselectCustom.vue';
import {
  $rates,
  addPayable,
  CATEGORIES,
  contraValues,
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
const dueDate = ref('');

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
    showError('Ingresa una descripción para la cuenta por pagar');
    return;
  }
  if (amount <= 0) {
    showError('Ingresa un monto mayor a cero');
    return;
  }
  if (currency.value === 'VES' && rates.value.bcv <= 0) {
    showError('Configura la tasa BCV para registrar cuentas en bolívares');
    return;
  }

  const payable = addPayable({
    description: description.value,
    category: category.value,
    amount,
    currency: currency.value,
    date: date.value || undefined,
    dueDate: dueDate.value || undefined,
  });
  showSuccess(
    `Cuenta por pagar registrada: ${formatUsd(contraValues(payable).usdUsdt)}`,
  );
  description.value = '';
  amountRaw.value = '';
  date.value = todayIso();
  dueDate.value = '';
  emit('success');
  if (!props.inModal) void navigate('/por-pagar/List');
}
</script>

<template>
  <component
    :is="inModal ? 'div' : 'section'"
    :class="inModal ? '' : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'"
  >
    <div v-if="!inModal" class="flex items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 text-base font-bold text-slate-900">
        <CalendarClock class="h-5 w-5 text-amber-500" aria-hidden="true" />
        Registrar cuenta por pagar
      </h2>
      <button
        type="button"
        aria-label="Abrir calculadora"
        title="Abrir calculadora"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
        @click="showCalc = true"
      >
        <Calculator class="h-4 w-4" aria-hidden="true" />
        Calcular
      </button>
    </div>

    <form :class="inModal ? 'flex flex-col gap-4' : 'mt-4 flex flex-col gap-4'" @submit.prevent="handleSubmit">
      <BaseInput
        id="payable-description"
        v-model="description"
        type="text"
        label="Descripción"
        placeholder="Ej. Alquiler del mes"
        :max-length="80"
        :rules="descRules"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <MultiselectCustom
          id="payable-category"
          v-model="category"
          :options="[...CATEGORIES]"
          label="Categoría"
          placeholder="Selecciona una categoría"
          :show-icons="false"
          :allow-empty="false"
        />

        <BaseInput
          id="payable-date"
          v-model="date"
          type="date"
          label="Fecha"
        />
      </div>

      <BaseInput
        id="payable-amount"
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

      <BaseInput
        id="payable-due-date"
        v-model="dueDate"
        type="date"
        label="Vencimiento (opcional)"
      />
      <p
        v-if="rates.bcv > 0 || rates.usdt > 0"
        class="-mt-3 text-xs text-slate-500"
      >
        Al marcarla como pagada se convertirá en gasto con las tasas del momento
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
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 active:bg-amber-700"
        >
          <CalendarClock class="h-4 w-4" aria-hidden="true" />
          Agregar por pagar
        </button>
      </div>

      <button
        v-else
        type="submit"
        class="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 active:bg-amber-700"
      >
        <CalendarClock class="h-4 w-4" aria-hidden="true" />
        Agregar por pagar
      </button>
    </form>

    <CalculatorModal
      :open="showCalc"
      accent="amber"
      @apply="applyCalc"
      @close="showCalc = false"
    />
  </component>
</template>
