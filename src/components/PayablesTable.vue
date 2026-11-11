<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStore } from '@nanostores/vue';
import { CirclePlus } from 'lucide-vue-next';
import {
  $payables,
  $rates,
  CATEGORIES,
  contraValues,
  payPayable,
  removePayable,
  type Category,
  type Payable,
} from '../stores/budgetStore';
import { formatUsd, formatVes, todayIso } from '../utils/formatters';
import { useDateFormat } from '@/composables/ui/useDateFormat';
import { useSwal } from '@/composables/ui/useSwal';
import { useSwalToast } from '@/composables/ui/useSwalToast';
import BaseInput from '@/components/BaseInput.vue';
import MultiselectCustom from '@/components/MultiselectCustom.vue';
import CustomTable from '@/components/table/CustomTable.vue';
import ImportExportActions from '@/components/ImportExportActions.vue';
import type { TableHeader } from '@/const/tableConst';

const { formatDateFriendly } = useDateFormat();
const { showConfirm } = useSwal();
const { showSuccess, showInfo } = useSwalToast();

const payables = useStore($payables);
const rates = useStore($rates);
const query = ref('');
const catFilter = ref<'Todas' | Category>('Todas');

const catOptions = ['Todas', ...CATEGORIES] as const;

const filtered = computed(() =>
  payables.value.filter(
    (e) =>
      (catFilter.value === 'Todas' || e.category === catFilter.value) &&
      e.description
        .toLowerCase()
        .includes(query.value.trim().toLowerCase()),
  ),
);

const totals = computed(() =>
  filtered.value.reduce(
    (acc, e) => {
      const c = contraValues(e, rates.value);
      acc.usdUsdt += c.usdUsdt;
      acc.usdBcv += c.usdBcv;
      acc.vesBcv += c.vesBcv;
      acc.vesUsdt += c.vesUsdt;
      return acc;
    },
    { usdUsdt: 0, usdBcv: 0, vesBcv: 0, vesUsdt: 0 },
  ),
);

// --- Paginación local (CustomTable es agnóstico del origen de datos) ---
const currentPage = ref(1);
const perPage = ref(10);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / perPage.value)),
);

watch([filtered, perPage], () => {
  if (currentPage.value > totalPages.value) currentPage.value = 1;
});

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return filtered.value.slice(start, start + perPage.value);
});

const today = todayIso();

function isOverdue(p: Payable): boolean {
  return Boolean(p.dueDate) && p.dueDate! < today;
}

// Cada fila combina la cuenta por pagar con sus contravalores y estado.
type PayableRow = Payable &
  ReturnType<typeof contraValues> & { overdue: boolean };

const rows = computed<PayableRow[]>(() =>
  paginated.value.map((e) => ({
    ...e,
    ...contraValues(e, rates.value),
    overdue: isOverdue(e),
  })),
);

const headers: TableHeader[] = [
  { key: 'date', label: 'Fecha' },
  { key: 'description', label: 'Descripción' },
  { key: 'category', label: 'Categoría' },
  { key: 'usdUsdt', label: '$ USDT' },
  { key: 'vesBcv', label: 'Bs. BCV' },
  { key: 'dueDate', label: 'Vencimiento' },
  { key: 'status', label: 'Estado' },
];

function getActionsForItem() {
  return [
    {
      name: 'pay',
      icon: 'check-circle',
      class: 'hover:bg-emerald-50 hover:text-emerald-600',
      tooltip: 'Marcar como pagada',
    },
    {
      name: 'delete',
      icon: 'trash',
      class: 'hover:bg-rose-50 hover:text-rose-600',
      tooltip: 'Eliminar cuenta por pagar',
    },
  ];
}

async function handleActionClick(payload: {
  actionName: string;
  item: { id: string | number; [key: string]: any };
}) {
  const { actionName, item } = payload;

  if (actionName === 'pay') {
    const confirmed = await showConfirm(
      'Marcar como pagada',
      `"${item.description}" se registrará como gasto por ${formatUsd(item.usdUsdt)} con las tasas actuales.`,
      { confirmButtonText: 'Sí, pagar', icon: 'question' },
    );
    if (!confirmed) return;
    const expense = payPayable(String(item.id));
    if (expense) {
      showSuccess(
        `Pagada y movida a gastos: ${formatUsd(contraValues(expense).usdUsdt)}`,
      );
    }
    return;
  }

  if (actionName === 'delete') {
    const confirmed = await showConfirm(
      'Eliminar cuenta por pagar',
      `¿Seguro que quieres eliminar "${item.description}"? Esta acción no se puede deshacer.`,
      { confirmButtonText: 'Sí, eliminar', icon: 'warning' },
    );
    if (!confirmed) return;
    removePayable(String(item.id));
    showInfo('Cuenta por pagar eliminada');
  }
}
</script>

<template>
  <section class="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div
      class="flex items-end justify-between gap-3 border-b border-slate-200 p-4 sm:p-5"
    >
      <div
        class="flex min-w-0 flex-1 items-end justify-start gap-2"
      >
        <BaseInput
          id="payable-search"
          v-model="query"
          placeholder="Buscar…"
          autocomplete="off"
          label="Buscar"
          class="w-full min-w-0 flex-1 lg:w-44 lg:flex-none xl:w-48 [&_input]:h-10 [&_input]:rounded-lg! [&_input]:bg-slate-50! [&_input]:py-2! [&_input]:pr-3! [&_input]:text-xs! sm:[&_input]:text-sm!"
        />

        <div class="min-w-0 flex-1 lg:w-44 lg:flex-none xl:w-48 [&_label]:truncate [&_label]:font-semibold [&_label]:whitespace-nowrap">
          <MultiselectCustom
            v-model="catFilter"
            :options="[...catOptions]"
            placeholder="Todas las categorías"
            :show-icons="false"
            :show-descriptions="false"
            :allow-empty="false"
            aria-label="Filtrar por categoría"
            label="Categoría"
            class="w-full"
          />
        </div>

        <ImportExportActions />

        <a
          href="/por-pagar/New"
          aria-label="Registrar cuenta por pagar"
          class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-bold whitespace-nowrap text-white shadow-sm transition hover:bg-amber-600 active:bg-amber-700 lg:px-4 lg:text-sm"
        >
          <CirclePlus class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span class="hidden lg:inline">Registrar por pagar</span>
        </a>
      </div>
    </div>

    <p
      v-if="filtered.length > 0"
      class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 sm:px-5"
    >
      <span>Pendiente {{ formatUsd(totals.usdUsdt) }}</span>
      <span class="text-sky-700">≈ {{ formatUsd(totals.usdBcv) }} a tasa BCV</span>
      <span class="text-amber-600">{{ formatVes(totals.vesUsdt) }} a tasa USDT</span>
    </p>

    <CustomTable
      :data="rows"
      :headers="headers"
      :actions="getActionsForItem"
      :current-page="currentPage"
      :total-pages="totalPages"
      :per-page="perPage"
      :total="filtered.length"
      :page-size-options="[10, 20, 50]"
      :is-loading="false"
      :hide-pagination="filtered.length === 0"
      @change-page="(page) => (currentPage = page)"
      @change-per-page="(size) => { perPage = size; currentPage = 1; }"
      @action-click="handleActionClick"
    >
      <template #cell(date)="{ value }">
        <span class="whitespace-nowrap text-slate-500">{{ formatDateFriendly(value) }}</span>
      </template>

      <template #cell(description)="{ item }">
        <p class="font-medium text-slate-900">{{ item.description }}</p>
        <p class="text-xs text-slate-400">
          Monto:
          {{ item.currency === 'VES' ? formatVes(item.amount) : formatUsd(item.amount) }}
        </p>
      </template>

      <template #cell(category)="{ value }">
        <span
          class="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
        >
          {{ value }}
        </span>
      </template>

      <template #cell(usdUsdt)="{ value }">
        <span class="font-semibold whitespace-nowrap text-slate-900">
          {{ formatUsd(value) }}
        </span>
      </template>

      <template #cell(vesBcv)="{ value }">
        <span class="whitespace-nowrap text-slate-600">{{ formatVes(value) }}</span>
      </template>

      <template #cell(dueDate)="{ value }">
        <span class="whitespace-nowrap text-slate-600">{{ formatDateFriendly(value) }}</span>
      </template>

      <template #cell(status)="{ item }">
        <span
          class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="
            item.overdue
              ? 'bg-rose-50 text-rose-700'
              : 'bg-amber-50 text-amber-700'
          "
        >
          {{ item.overdue ? 'Vencida' : 'Pendiente' }}
        </span>
      </template>
    </CustomTable>
  </section>
</template>
