<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Trash2,
  RefreshCw,
} from 'lucide-vue-next';
import Modal from '@/components/common/layout/Modal.vue';
import {
  downloadBudgetTemplate,
  parseAndValidateWorkbook,
  type WorkbookValidationResult,
} from '@/utils/excelImport';
import {
  importExpenses,
  importIncomes,
  importPayables,
  importReceivables,
} from '@/stores/budgetStore';
import { useSwalToast } from '@/composables/ui/useSwalToast';

interface Props {
  open: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success', count: number): void;
}>();

const { showSuccess, showError } = useSwalToast();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isProcessing = ref(false);
const selectedFileName = ref('');
const selectedFileSize = ref('');
const validationResult = ref<WorkbookValidationResult | null>(null);
const importMode = ref<'append' | 'replace'>('append');

const totalItems = computed(() => {
  const r = validationResult.value;
  if (!r) return 0;
  return (
    r.expenses.length +
    r.incomes.length +
    r.payables.length +
    r.receivables.length
  );
});

/** Vista previa plana de los primeros registros de todas las hojas */
const previewItems = computed(() => {
  const r = validationResult.value;
  if (!r) return [];
  const all = [
    ...r.incomes.map((i) => ({ sheet: 'Ingresos', group: i.source, ...i })),
    ...r.expenses.map((e) => ({ sheet: 'Gastos', group: e.category, ...e })),
    ...r.payables.map((p) => ({ sheet: 'Por pagar', group: p.category, ...p })),
    ...r.receivables.map((c) => ({
      sheet: 'Por cobrar',
      group: c.source,
      ...c,
    })),
  ];
  return all.slice(0, 5);
});

const previewExtra = computed(() => totalItems.value - previewItems.value.length);

function handleDownloadTemplate() {
  try {
    downloadBudgetTemplate();
    showSuccess('Descargando plantilla de presupuesto Excel');
  } catch (err) {
    showError('Error al generar la plantilla');
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function processFile(file: File) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    showError('Por favor selecciona un archivo Excel (.xlsx o .xls)');
    return;
  }

  isProcessing.value = true;
  selectedFileName.value = file.name;
  selectedFileSize.value = formatBytes(file.size);

  try {
    const result = await parseAndValidateWorkbook(file);
    validationResult.value = result;
  } catch (err: any) {
    showError(err?.message || 'Error al procesar el archivo Excel');
    resetFile();
  } finally {
    isProcessing.value = false;
  }
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
}

function resetFile() {
  selectedFileName.value = '';
  selectedFileSize.value = '';
  validationResult.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function handleConfirmImport() {
  const r = validationResult.value;
  if (!r || !r.isValid || totalItems.value === 0) {
    return;
  }

  importIncomes(r.incomes, importMode.value);
  importExpenses(r.expenses, importMode.value);
  importPayables(r.payables, importMode.value);
  importReceivables(r.receivables, importMode.value);

  showSuccess(
    importMode.value === 'replace'
      ? `Se reemplazó el presupuesto con ${totalItems.value} registro(s)`
      : `Se agregaron ${totalItems.value} registro(s) exitosamente`,
  );

  emit('success', totalItems.value);
  handleClose();
}

function handleClose() {
  resetFile();
  emit('close');
}
</script>

<template>
  <Modal :open="open" size="xl" @close="handleClose">
    <template #header>
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileSpreadsheet class="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 leading-tight">Importar presupuesto desde Excel</h3>
          <p class="text-xs text-slate-500">Ingresos, gastos y cuentas por pagar en un solo archivo</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Barra para descargar plantilla -->
      <div class="flex flex-col gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-2.5">
          <FileCheck2 class="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
          <div class="text-xs leading-relaxed text-slate-700">
            <span class="font-bold text-sky-950">¿Aún no tienes el formato?</span>
            <p class="text-slate-600">
              Descarga la plantilla con las tres hojas (Ingresos, Gastos y Por pagar), ejemplos y opciones permitidas.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 active:bg-sky-800"
          @click="handleDownloadTemplate"
        >
          <Download class="h-4 w-4" aria-hidden="true" />
          Descargar plantilla
        </button>
      </div>

      <!-- Zona de selección / drag and drop si no hay archivo cargado -->
      <div
        v-if="!selectedFileName"
        class="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer"
        :class="[
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50'
            : 'border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-white',
        ]"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="fileInputRef?.click()"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx, .xls"
          class="hidden"
          @change="handleFileChange"
        />

        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 transition group-hover:scale-105">
          <UploadCloud class="h-6 w-6" aria-hidden="true" />
        </div>

        <p class="mt-3 text-sm font-bold text-slate-800">
          Haz clic para subir o arrastra tu archivo Excel
        </p>
        <p class="mt-1 text-xs text-slate-500">
          Formatos soportados: .xlsx, .xls
        </p>
      </div>

      <!-- Tarjeta de archivo seleccionado -->
      <div
        v-else
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <FileSpreadsheet class="h-5 w-5" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-slate-900">{{ selectedFileName }}</p>
            <p class="text-xs text-slate-500">{{ selectedFileSize }}</p>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
          @click="resetFile"
        >
          <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
          Cambiar archivo
        </button>
      </div>

      <!-- Indicador de procesamiento -->
      <div v-if="isProcessing" class="flex items-center justify-center gap-2 py-8 text-slate-500">
        <RefreshCw class="h-5 w-5 animate-spin text-emerald-600" />
        <span class="text-sm font-semibold">Validando casillas del archivo Excel...</span>
      </div>

      <!-- RESULTADO DE LA VALIDACIÓN: ERRORES ORDENADOS POR CASILLAS -->
      <div
        v-else-if="validationResult && !validationResult.isValid"
        class="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4"
      >
        <div class="flex items-start gap-3">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          <div>
            <h4 class="text-sm font-bold text-rose-950">
              Se encontraron {{ validationResult.errors.length }} error(es) en el archivo
            </h4>
            <p class="text-xs text-rose-800">
              Los errores se detallan a continuación en el orden de las casillas de Excel para que puedas ubicarlos y corregirlos rápidamente en tu archivo.
            </p>
          </div>
        </div>

        <!-- Tabla ordenada de casillas con error -->
        <div class="max-h-60 overflow-y-auto rounded-xl border border-rose-200/80 bg-white shadow-xs">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 border-b border-rose-100 bg-rose-50/90 text-rose-900 backdrop-blur-xs font-bold">
              <tr>
                <th class="px-3 py-2 w-24">Hoja</th>
                <th class="px-3 py-2 text-center w-20">Casilla</th>
                <th class="px-3 py-2 w-28">Campo</th>
                <th class="px-3 py-2 w-32">Valor detectado</th>
                <th class="px-3 py-2">Motivo del error</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr
                v-for="(err, idx) in validationResult.errors"
                :key="idx"
                class="hover:bg-rose-50/30 transition-colors"
              >
                <td class="px-3 py-2 text-slate-600 whitespace-nowrap">
                  {{ err.sheet || '—' }}
                </td>
                <td class="px-3 py-2 text-center font-mono font-bold">
                  <span class="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-rose-800 font-bold text-xs tracking-wide">
                    {{ err.cell }}
                  </span>
                </td>
                <td class="px-3 py-2 font-medium text-slate-800">
                  {{ err.header }}
                </td>
                <td class="px-3 py-2 text-slate-500 font-mono truncate max-w-[120px]" :title="err.value">
                  {{ err.value || '(vacío)' }}
                </td>
                <td class="px-3 py-2 text-rose-700 font-medium">
                  {{ err.message }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RESULTADO DE LA VALIDACIÓN: ÉXITO -->
      <div
        v-else-if="validationResult && validationResult.isValid"
        class="space-y-4"
      >
        <div class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <CheckCircle2 class="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <h4 class="text-sm font-bold text-emerald-950">
              ¡Archivo validado correctamente!
            </h4>
            <p class="text-xs text-emerald-800">
              Se verificaron {{ totalItems }} registro(s) sin errores:
              {{ validationResult.incomes.length }} ingreso(s),
              {{ validationResult.expenses.length }} gasto(s),
              {{ validationResult.payables.length }} por pagar y
              {{ validationResult.receivables.length }} por cobrar.
            </p>
          </div>
        </div>

        <!-- Modo de importación -->
        <div class="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-500">¿Cómo deseas importar?</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition"
              :class="[
                importMode === 'append'
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700',
              ]"
            >
              <input
                v-model="importMode"
                type="radio"
                name="importMode"
                value="append"
                class="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span class="block text-xs font-bold">Añadir a los registros actuales</span>
                <span class="block text-[11px] text-slate-500">Conserva tus datos existentes y agrega los del Excel.</span>
              </div>
            </label>

            <label
              class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition"
              :class="[
                importMode === 'replace'
                  ? 'border-rose-500 bg-rose-50/40 text-rose-950 ring-1 ring-rose-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700',
              ]"
            >
              <input
                v-model="importMode"
                type="radio"
                name="importMode"
                value="replace"
                class="mt-1 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span class="block text-xs font-bold text-rose-900">Reemplazar todos los datos</span>
                <span class="block text-[11px] text-slate-500">Borra ingresos, gastos, por pagar y por cobrar actuales; carga solo los del archivo.</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Vista previa resumida de los datos -->
        <div class="space-y-1.5">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
            Vista previa (primeros registros)
          </p>
          <div class="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th class="px-3 py-2">Hoja</th>
                  <th class="px-3 py-2">Fecha</th>
                  <th class="px-3 py-2">Descripción</th>
                  <th class="px-3 py-2">Grupo</th>
                  <th class="px-3 py-2 text-right">Monto</th>
                  <th class="px-3 py-2 text-center">Moneda</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(item, i) in previewItems" :key="i">
                  <td class="px-3 py-2">
                    <span
                      class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      :class="{
                        'bg-emerald-50 text-emerald-700': item.sheet === 'Ingresos',
                        'bg-sky-50 text-sky-700': item.sheet === 'Gastos',
                        'bg-amber-50 text-amber-700': item.sheet === 'Por pagar',
                        'bg-violet-50 text-violet-700': item.sheet === 'Por cobrar',
                      }"
                    >
                      {{ item.sheet }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-slate-600">{{ item.date }}</td>
                  <td class="px-3 py-2 font-medium text-slate-800 truncate max-w-[200px]">{{ item.description }}</td>
                  <td class="px-3 py-2">
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {{ item.group }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                    {{ item.amount.toFixed(2) }}
                  </td>
                  <td class="px-3 py-2 text-center font-bold text-xs" :class="item.currency === 'USDT' ? 'text-emerald-700' : 'text-sky-700'">
                    {{ item.currency }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="previewExtra > 0" class="text-[11px] text-slate-400 text-right">
            + {{ previewExtra }} registro(s) más listos para importar
          </p>
        </div>
      </div>

      <!-- Acciones del pie del modal -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          @click="handleClose"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition"
          :class="[
            validationResult && validationResult.isValid
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              : 'bg-slate-300 cursor-not-allowed text-slate-500',
          ]"
          :disabled="!validationResult || !validationResult.isValid"
          @click="handleConfirmImport"
        >
          <FileSpreadsheet class="h-4 w-4" aria-hidden="true" />
          Confirmar e importar {{ totalItems ? `(${totalItems})` : '' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
