<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  Settings2,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
} from 'lucide-vue-next';
import {
  $expenses,
  $incomes,
  $payables,
  $receivables,
  $rates,
  $totalIncome,
  clearAllData,
  markChangesExported,
  type Expense,
  type Income,
  type Payable,
  type Receivable,
} from '@/stores/budgetStore';
import {
  exportBudgetToExcel,
  exportModuleToExcel,
  type ModuleKind,
} from '@/utils/excelExport';
import { useSwal } from '@/composables/ui/useSwal';
import { useSwalToast } from '@/composables/ui/useSwalToast';
import Modal from '@/components/common/layout/Modal.vue';
import ImportDataModal from '@/components/ImportDataModal.vue';

interface Props {
  open: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { showConfirm } = useSwal();
const { showSuccess, showInfo } = useSwalToast();

const expenses = useStore($expenses);
const incomes = useStore($incomes);
const payables = useStore($payables);
const receivables = useStore($receivables);
const rates = useStore($rates);
const totalIncome = useStore($totalIncome);

/** Import en curso: null = cerrado, 'all' = todo, SheetKind = módulo específico */
const importScope = ref<'all' | ModuleKind | null>(null);

interface ModuleRow {
  kind: ModuleKind;
  label: string;
  dot: string;
  items: () => readonly (Expense | Income | Payable | Receivable)[];
}

const modules: ModuleRow[] = [
  { kind: 'incomes', label: 'Ingresos', dot: 'bg-emerald-500', items: () => incomes.value },
  { kind: 'expenses', label: 'Gastos', dot: 'bg-rose-500', items: () => expenses.value },
  { kind: 'payables', label: 'Por pagar', dot: 'bg-amber-500', items: () => payables.value },
  { kind: 'receivables', label: 'Por cobrar', dot: 'bg-violet-500', items: () => receivables.value },
];

const totalRecords = computed(
  () =>
    expenses.value.length +
    incomes.value.length +
    payables.value.length +
    receivables.value.length,
);

function handleExportAll() {
  if (totalRecords.value === 0) {
    showInfo('No hay registros para exportar');
    return;
  }
  exportBudgetToExcel({
    expenses: expenses.value,
    incomes: incomes.value,
    payables: payables.value,
    receivables: receivables.value,
    rates: rates.value,
    incomeUsd: totalIncome.value.usd,
  });
  markChangesExported();
  showSuccess(`Excel generado con ${totalRecords.value} registro(s)`);
}

function handleExportModule(mod: ModuleRow) {
  const items = mod.items();
  if (items.length === 0) {
    showInfo(`No hay registros de ${mod.label.toLowerCase()} para exportar`);
    return;
  }
  exportModuleToExcel(mod.kind, items, rates.value, totalIncome.value.usd);
  showSuccess(`Excel de ${mod.label.toLowerCase()} generado con ${items.length} registro(s)`);
}

function openImportAll() {
  emit('close');
  importScope.value = 'all';
}

function openImportModule(kind: ModuleKind) {
  emit('close');
  importScope.value = kind;
}

function closeImportModal() {
  importScope.value = null;
}

async function handleClearAll() {
  if (totalRecords.value === 0) {
    showInfo('No hay registros guardados para limpiar');
    return;
  }

  const ok = await showConfirm(
    '¿Limpiar todos los listados?',
    `Se eliminarán permanentemente ${totalRecords.value} registro(s): ${incomes.value.length} ingreso(s), ${expenses.value.length} gasto(s), ${payables.value.length} por pagar y ${receivables.value.length} por cobrar. Esta acción no se puede deshacer. Te recomendamos exportar todo antes de continuar.`,
    { confirmButtonText: 'Sí, borrar todo' },
  );
  if (!ok) return;

  clearAllData();
  showSuccess('Se limpiaron todos los listados');
  emit('close');
}
</script>

<template>
  <Modal :open="open" size="xl" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Settings2 class="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 leading-tight">Más opciones</h3>
          <p class="text-xs text-slate-500">Exportar, importar y gestionar todos tus datos</p>
        </div>
      </div>
    </template>

    <div class="space-y-5">
      <!-- Acciones generales sobre todo el presupuesto -->
      <section class="space-y-2">
        <h4 class="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Todo el presupuesto
        </h4>
        <div class="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            @click="handleExportAll"
          >
            <FileSpreadsheet class="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            Exportar todo
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            @click="openImportAll"
          >
            <Upload class="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            Importar todo
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
            @click="handleClearAll"
          >
            <Trash2 class="h-4 w-4 shrink-0" aria-hidden="true" />
            Limpiar todo
          </button>
        </div>
        <p class="text-[11px] text-slate-400">
          Tienes {{ totalRecords }} registro(s) guardado(s) en este navegador.
        </p>
      </section>

      <!-- Acciones específicas por módulo -->
      <section class="space-y-2">
        <h4 class="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Por módulo
        </h4>
        <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200">
          <li
            v-for="mod in modules"
            :key="mod.kind"
            class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
          >
            <div class="flex min-w-0 items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="mod.dot" aria-hidden="true" />
              <span class="truncate text-sm font-semibold text-slate-800">{{ mod.label }}</span>
              <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                {{ mod.items().length }}
              </span>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                @click="handleExportModule(mod)"
              >
                <Download class="h-3.5 w-3.5" aria-hidden="true" />
                Exportar
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                @click="openImportModule(mod.kind)"
              >
                <Upload class="h-3.5 w-3.5" aria-hidden="true" />
                Importar
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </Modal>

  <ImportDataModal
    :open="importScope !== null"
    :scope="importScope ?? 'all'"
    @close="closeImportModal"
    @success="closeImportModal"
  />
</template>
