<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { X } from 'lucide-vue-next';

/**
 * BasePopover — Tooltip / Popover flotante para desgloses de datos.
 *
 * Interacción:
 * - Se abre al pasar el cursor sobre el contenido del slot (trigger).
 * - Debounce de 180ms al salir para permitir entrar al propio popover.
 * - Se cierra con el botón `×`, click fuera del componente o `hide()` expuesto.
 * - Renderiza vía Teleport con position: fixed: nunca queda recortado por
 *   contenedores con overflow (tablas, barras de scroll, etc).
 *
 * Uso básico:
 * <BasePopover title="Desglose" :rows="[{label, value}]" total-label="Total" :total-value="total">
 *   <button>Elemento disparador</button>
 * </BasePopover>
 */

export interface PopoverRow {
  label: string;
  value: string | number;
}

interface Props {
  title: string;
  badge?: string;
  rows?: PopoverRow[];
  totalLabel?: string;
  totalValue?: string | number;
  disabled?: boolean;
  /** Ancho aproximado del popover (px), usado para no desbordar el viewport */
  width?: number;
  /** Clase extra para el valor total (ej. color según signo) */
  totalClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  badge: '',
  rows: () => [],
  totalLabel: 'Total',
  totalValue: '',
  disabled: false,
  width: 280,
  totalClass: 'text-[#800020]',
});

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const popoverPos = ref({ left: 0, top: 0 });
let closeTimeout: ReturnType<typeof setTimeout> | null = null;

const open = () => {
  if (props.disabled) return;
  if (closeTimeout) clearTimeout(closeTimeout);
  const rect = triggerRef.value?.getBoundingClientRect();
  if (!rect) return;
  popoverPos.value = {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - props.width - 8)),
    top: rect.bottom + 6,
  };
  isOpen.value = true;
};

const close = () => {
  if (closeTimeout) clearTimeout(closeTimeout);
  closeTimeout = setTimeout(() => {
    isOpen.value = false;
  }, 180);
};

const hide = () => {
  if (closeTimeout) clearTimeout(closeTimeout);
  isOpen.value = false;
};

const cancelClose = () => {
  if (closeTimeout) clearTimeout(closeTimeout);
};

const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.base-popover') && !triggerRef.value?.contains(target)) {
    hide();
  }
};

onMounted(() => document.addEventListener('click', handleDocumentClick));
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  if (closeTimeout) clearTimeout(closeTimeout);
});

defineExpose({ open, hide, close, isOpen });
</script>

<template>
  <!-- Trigger: el contenido del slot abre el popover al hacer hover -->
  <div
    ref="triggerRef"
    class="inline-flex shrink-0"
    @mouseenter="open"
    @mouseleave="close"
  >
    <slot />
  </div>

  <!-- Popover flotante (Teleport para no recortarse por overflow) -->
  <Teleport to="body">
    <Transition name="base-popover-fade">
      <div
        v-if="isOpen"
        class="base-popover"
        :style="{ left: `${popoverPos.left}px`, top: `${popoverPos.top}px` }"
        @mouseenter="cancelClose"
        @mouseleave="close"
        @click.stop
      >
        <!-- Encabezado: título + badge + botón cerrar -->
        <div class="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] font-extrabold tracking-wider text-slate-800 uppercase">
              {{ title }}
            </span>
            <span
              v-if="badge"
              class="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
            >
              {{ badge }}
            </span>
          </div>
          <button
            type="button"
            class="cursor-pointer text-slate-400 transition-colors hover:text-slate-700"
            aria-label="Cerrar desglose"
            @click.stop="hide"
          >
            <X :size="13" />
          </button>
        </div>

        <!-- Filas del desglose (personalizable con slot #rows) -->
        <div class="mb-2 flex flex-col gap-1.5">
          <slot name="rows">
            <div
              v-for="row in rows"
              :key="row.label"
              class="flex items-center justify-between gap-4 text-[11.5px]"
            >
              <span class="text-slate-500">{{ row.label }}</span>
              <span class="font-semibold text-slate-800">{{ row.value }}</span>
            </div>
          </slot>
        </div>

        <!-- Fila de total -->
        <div
          v-if="totalValue !== '' && totalValue !== null"
          class="flex items-center justify-between border-t border-slate-200 pt-2 text-[11.5px]"
        >
          <span class="font-bold text-slate-800">{{ totalLabel }}</span>
          <span class="font-extrabold" :class="totalClass">{{ totalValue }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-popover {
  position: fixed;
  min-width: 260px;
  max-width: 300px;
  z-index: 1060;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow:
    0 12px 28px -4px rgba(15, 23, 42, 0.16),
    0 4px 10px -2px rgba(15, 23, 42, 0.08);
  text-align: left;
}

.base-popover-fade-enter-active,
.base-popover-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.base-popover-fade-enter-from,
.base-popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media print {
  .base-popover {
    display: none !important;
  }
}
</style>
