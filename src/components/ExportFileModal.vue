<script setup lang="ts">
import { ref, watch } from 'vue';
import { FileSpreadsheet, Download } from 'lucide-vue-next';
import Modal from '@/components/common/layout/Modal.vue';
import InputText from '@/components/baseInput/InputText.vue';

interface Props {
  open: boolean;
  /** Nombre sugerido sin extensión (ej. "presupuesto-2026-10") */
  defaultName: string;
  /** Etiqueta del contexto, ej. "todo el presupuesto" o "Gastos" */
  scopeLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  scopeLabel: 'el presupuesto',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', fileName: string): void;
}>();

const fileName = ref('');

watch(
  () => props.open,
  (val) => {
    if (val) fileName.value = props.defaultName;
  },
  { immediate: true },
);

function handleConfirm() {
  emit('confirm', fileName.value.trim() || props.defaultName);
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <Modal :open="open" size="sm" @close="handleClose">
    <template #header>
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileSpreadsheet class="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 leading-tight">Exportar Excel</h3>
          <p class="text-xs text-slate-500">{{ scopeLabel }}</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <div>
        <label class="mb-1 block text-xs font-semibold text-slate-600" for="export-filename">
          Nombre del archivo
        </label>
        <div class="flex items-center gap-1.5">
          <InputText
            id="export-filename"
            v-model="fileName"
            placeholder="presupuesto-2026-10"
            @keydown.enter="handleConfirm"
          />
          <span class="shrink-0 text-xs font-semibold text-slate-400">.xlsx</span>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">
          Se descargará como
          <span class="font-semibold text-slate-500">
            {{ (fileName.trim() || defaultName) }}.xlsx
          </span>
        </p>
      </div>

      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          @click="handleClose"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
          @click="handleConfirm"
        >
          <Download class="h-3.5 w-3.5" aria-hidden="true" />
          Descargar
        </button>
      </div>
    </div>
  </Modal>
</template>
