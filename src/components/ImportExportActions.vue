<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from '@nanostores/vue';
import { FileSpreadsheet, Upload } from 'lucide-vue-next';
import {
  $budgets,
  $budgetSummary,
  $expenses,
  $incomes,
  $payables,
  $receivables,
  $rates,
  $totalIncome,
  markChangesExported,
} from '../stores/budgetStore';
import { exportBudgetToExcel } from '../utils/excelExport';
import { useSwalToast } from '@/composables/ui/useSwalToast';
import ImportDataModal from '@/components/ImportDataModal.vue';
import ExportFileModal from '@/components/ExportFileModal.vue';

const { showSuccess, showInfo } = useSwalToast();

const expenses = useStore($expenses);
const incomes = useStore($incomes);
const payables = useStore($payables);
const receivables = useStore($receivables);
const rates = useStore($rates);
const totalIncome = useStore($totalIncome);
const budgets = useStore($budgets);
const budgetSummary = useStore($budgetSummary);

const showImportModal = ref(false);
const showExportModal = ref(false);
const exportDefaultName = ref('');

const totalItems = computed(
  () =>
    expenses.value.length +
    incomes.value.length +
    payables.value.length +
    receivables.value.length +
    Object.keys(budgets.value).length,
);

function monthStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function handleExport() {
  if (totalItems.value === 0) {
    showInfo('No hay registros para exportar');
    return;
  }
  exportDefaultName.value = `presupuesto-${monthStamp()}`;
  showExportModal.value = true;
}

function handleExportConfirm(fileName: string) {
  exportBudgetToExcel({
    expenses: expenses.value,
    incomes: incomes.value,
    payables: payables.value,
    receivables: receivables.value,
    rates: rates.value,
    incomeUsd: totalIncome.value.usd,
    budgetSummary: budgetSummary.value,
    fileName,
  });
  markChangesExported();
  showSuccess(`Excel generado con ${totalItems.value} registro(s)`);
  showExportModal.value = false;
}
</script>

<template>
  <button
    type="button"
    aria-label="Importar Excel"
    class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold whitespace-nowrap text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 lg:px-3.5 lg:text-sm"
    @click="showImportModal = true"
  >
    <Upload class="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
    <span class="hidden lg:inline">Importar Excel</span>
  </button>

  <button
    type="button"
    aria-label="Exportar Excel"
    class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold whitespace-nowrap text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 lg:px-3.5 lg:text-sm"
    @click="handleExport"
  >
    <FileSpreadsheet class="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
    <span class="hidden lg:inline">Exportar Excel</span>
  </button>

  <ImportDataModal :open="showImportModal" @close="showImportModal = false" />
  <ExportFileModal
    :open="showExportModal"
    :default-name="exportDefaultName"
    scope-label="todo el presupuesto"
    @close="showExportModal = false"
    @confirm="handleExportConfirm"
  />
</template>
