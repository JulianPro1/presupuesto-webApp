<script setup lang="ts">
/**
 * Los datos de esta app viven solo en el navegador (localStorage): no hay
 * backend ni backup automático. Un navegador NO permite bloquear el cierre
 * de una pestaña ni ejecutar una descarga de archivo dentro de
 * `beforeunload` (por seguridad, para que ningún sitio pueda "retener" al
 * usuario) — por eso no es posible forzar técnicamente una exportación al
 * cerrar. Lo máximo permitido es el diálogo nativo "¿Salir del sitio?",
 * que este componente activa cuando hay cambios sin exportar, junto con un
 * aviso persistente en pantalla con acceso directo a exportar.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useStore } from '@nanostores/vue';
import { TriangleAlert, FileSpreadsheet, X } from 'lucide-vue-next';
import {
  $budgets,
  $budgetSummary,
  $expenses,
  $hasUnexportedChanges,
  $incomes,
  $payables,
  $rates,
  $receivables,
  $totalIncome,
  markChangesExported,
} from '@/stores/budgetStore';
import { exportBudgetToExcel } from '@/utils/excelExport';
import { useSwalToast } from '@/composables/ui/useSwalToast';
import ExportFileModal from '@/components/ExportFileModal.vue';

const { showSuccess, showInfo } = useSwalToast();

const dirty = useStore($hasUnexportedChanges);
const expenses = useStore($expenses);
const incomes = useStore($incomes);
const payables = useStore($payables);
const receivables = useStore($receivables);
const rates = useStore($rates);
const totalIncome = useStore($totalIncome);
const budgets = useStore($budgets);
const budgetSummary = useStore($budgetSummary);

const totalRecords = computed(
  () =>
    expenses.value.length +
    incomes.value.length +
    payables.value.length +
    receivables.value.length +
    Object.keys(budgets.value).length,
);

const showBanner = computed(() => dirty.value && totalRecords.value > 0);

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (!showBanner.value) return;
  // Los navegadores modernos ignoran mensajes personalizados y muestran
  // su propio texto genérico; esto solo controla si el diálogo aparece.
  e.preventDefault();
  e.returnValue = '';
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

const showExportModal = ref(false);
const exportDefaultName = ref('');

function monthStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function handleExportNow() {
  if (totalRecords.value === 0) {
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
  showSuccess(`Excel generado con ${totalRecords.value} registro(s)`);
  showExportModal.value = false;
}

/** "Descartar" solo oculta el aviso hasta el próximo cambio; no borra nada. */
function handleDismiss() {
  markChangesExported();
}
</script>

<template>
  <div
    v-if="showBanner"
    role="alert"
    class="fixed inset-x-0 bottom-16 z-30 mx-auto flex w-full max-w-xl flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg sm:bottom-4"
    style="left: 50%; transform: translateX(-50%)"
  >
    <TriangleAlert class="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
    <p class="min-w-0 flex-1 text-xs text-amber-900 sm:text-sm">
      <span class="font-bold">Tienes cambios sin exportar.</span>
      Esta app solo guarda datos en este navegador: si cierras la pestaña sin
      exportar, podrías perderlos.
    </p>
    <div class="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white transition hover:bg-amber-700"
        @click="handleExportNow"
      >
        <FileSpreadsheet class="h-3.5 w-3.5" aria-hidden="true" />
        Exportar ahora
      </button>
      <button
        type="button"
        aria-label="Descartar aviso"
        class="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-100"
        @click="handleDismiss"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>

  <ExportFileModal
    :open="showExportModal"
    :default-name="exportDefaultName"
    scope-label="todo el presupuesto"
    @close="showExportModal = false"
    @confirm="handleExportConfirm"
  />
</template>
