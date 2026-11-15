<script setup lang="ts">
import {
  Comment,
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useSlots,
  watch,
} from 'vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import { X, RotateCcw, SlidersHorizontal, Settings } from 'lucide-vue-next';

interface Props {
  actionMethod?: () => void;
  actionLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  actionMethod: undefined,
  actionLabel: 'Limpiar',
});

const emit = defineEmits<{
  (e: 'apply-filters'): void;
}>();

const slots = useSlots();
const uniqueId = Math.random().toString(36).slice(2, 10);

const filtersTarget = `#filter-filters-${uniqueId}`;

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

const isFiltersOpen = ref(false);
const isActionsOpen = ref(false);

// Expansión del filtro primario en móvil: al enfocar el input de búsqueda
// ocupa toda la fila y los botones (Filtros/Acciones) bajan a una segunda
// fila mostrando su texto. Al salir el foco, vuelven a modo solo-icono.
const isSearchFocused = ref(false);
let searchBlurTimer: ReturnType<typeof setTimeout> | undefined;

const onPrimaryFocusIn = () => {
  if (searchBlurTimer) {
    clearTimeout(searchBlurTimer);
    searchBlurTimer = undefined;
  }
  isSearchFocused.value = true;
};

const onPrimaryFocusOut = (event: FocusEvent) => {
  const container = event.currentTarget as HTMLElement;
  if (event.relatedTarget && container.contains(event.relatedTarget as Node)) return;
  // Delay corto: si el blur fue por tocar un botón de la barra, el click
  // debe completarse antes de que la fila colapse y el botón se mueva.
  searchBlurTimer = setTimeout(() => {
    isSearchFocused.value = false;
  }, 150);
};

const openFilters = () => {
  isSearchFocused.value = false;
  isFiltersOpen.value = true;
};
const closeFilters = () => {
  isFiltersOpen.value = false;
};
const applyFilters = () => {
  emit('apply-filters');
  closeFilters();
};

const openActions = () => {
  isSearchFocused.value = false;
  isActionsOpen.value = true;
};
const closeActions = () => {
  isActionsOpen.value = false;
};

const handleAction = () => {
  props.actionMethod?.();
};

const handleActionAndClose = () => {
  handleAction();
  closeFilters();
  closeActions();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeFilters();
    closeActions();
  }
};

const filterNodes = computed(() =>
  (slots.filters?.() || []).filter((v) => v.type !== Comment),
);

const explicitPrimaryCount = computed(
  () => filterNodes.value.filter((v) => (v.props as { primary?: unknown } | null)?.primary !== undefined).length,
);
const hasExplicitPrimary = computed(() => explicitPrimaryCount.value > 0);
const forcePrimary = computed(
  () => !hasExplicitPrimary.value && filterNodes.value.length === 1,
);

provide('filter-row-context', {
  isMobile,
  isFiltersOpen,
  isActionsOpen,
  filtersTarget,
  forcePrimary,
});

const filterCount = computed(() => {
  const primaryCount = hasExplicitPrimary.value
    ? explicitPrimaryCount.value
    : forcePrimary.value
      ? 1
      : 0;
  return Math.max(0, filterNodes.value.length - primaryCount);
});

const actionCount = computed(() => {
  const defaultActionCount = props.actionMethod ? 1 : 0;
  const slotActionCount = (slots.actions?.() || []).filter((v) => v.type !== Comment).length;
  return defaultActionCount + slotActionCount;
});

// El slot `cta` (ej. "Registrar X") es la acción primaria del listado: a
// diferencia de `actions` (operaciones secundarias/masivas), siempre queda
// visible —nunca se colapsa dentro del sheet de Acciones— para que crear un
// registro nuevo siga siendo un solo toque también en móvil.
const hasCta = computed(() => Boolean(slots.cta));

// El botón "Acciones" solo es relevante si hay acciones vía slot
// (actionMethod/Limpiar es por defecto y ya va en el footer del sheet de filtros)
const hasSlotActions = computed(() => actionCount.value - (props.actionMethod ? 1 : 0) > 0);

// Cantidad de botones-icono visibles en la barra móvil colapsada (CTA +
// Filtros + Acciones, según apliquen), para reservarles el espacio exacto
// junto al input primario sin solaparse.
const visibleBadgeCount = computed(() => {
  let n = 0;
  if (hasCta.value) n += 1;
  if (filterCount.value > 0) n += 1;
  if (hasSlotActions.value) n += 1;
  return n;
});

onMounted(() => {
  window.addEventListener('resize', updateIsMobile);
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIsMobile);
  window.removeEventListener('keydown', handleKeydown);
  if (searchBlurTimer) clearTimeout(searchBlurTimer);
  document.body.style.overflow = '';
});

watch(
  () => isFiltersOpen.value || isActionsOpen.value,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
  },
);
</script>

<template>
  <div class="filter-row border-b border-slate-200 p-4 sm:p-5">
    <!-- Escritorio: grid de Tailwind con acciones a la derecha -->
    <div v-if="!isMobile" class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="grid grid-cols-12 items-end gap-3">
          <slot name="filters" />
          <div v-if="actionMethod" class="col-span-auto">
            <BaseButton variant="light" size="sm" @click="handleAction">
              <RotateCcw class="h-4 w-4" aria-hidden="true" />
              {{ actionLabel }}
            </BaseButton>
          </div>
        </div>
      </div>
      <div v-if="slots.actions || hasCta" class="flex shrink-0 items-end gap-2">
        <slot name="actions" />
        <slot name="cta" />
      </div>
    </div>

    <!-- Mobile: fila compacta con filtro principal y badges de Filtros/Acciones -->
    <template v-else>
      <div class="filter-top-row" :class="{ 'is-searching': isSearchFocused }">
        <div
          class="filter-primary-target"
          :style="
            !isSearchFocused && visibleBadgeCount > 0
              ? { marginRight: `${visibleBadgeCount * 48}px` }
              : {}
          "
          @focusin="onPrimaryFocusIn"
          @focusout="onPrimaryFocusOut"
        >
          <slot name="filters" />
        </div>

        <div v-if="filterCount > 0 || hasSlotActions || hasCta" class="filter-badges">
          <slot name="cta" />

          <BaseButton
            v-if="filterCount > 0"
            variant="dark"
            size="sm"
            aria-label="Filtros"
            class="filter-badge-btn"
            @click="openFilters"
          >
            <SlidersHorizontal class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="filter-badge-text">Filtros</span>
            <span class="badge-count">{{ filterCount }}</span>
          </BaseButton>

          <BaseButton
            v-if="hasSlotActions"
            variant="primary"
            size="sm"
            aria-label="Acciones"
            class="filter-badge-btn"
            @click="openActions"
          >
            <Settings class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="filter-badge-text">Acciones</span>
            <span class="badge-count">{{ actionCount }}</span>
          </BaseButton>
        </div>
      </div>

      <!-- Bottom sheet: filtros -->
      <Teleport to="body">
        <div
          v-if="isFiltersOpen"
          class="fixed inset-0 z-50 flex items-end bg-slate-950/40 backdrop-blur-[2px]"
          @click="closeFilters"
        >
          <div
            class="sheet-enter flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span class="text-sm font-bold text-slate-900">Filtros</span>
              <button
                type="button"
                aria-label="Cerrar"
                class="rounded-full bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200"
                @click="closeFilters"
              >
                <X class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div :id="filtersTarget.slice(1)" class="grid grid-cols-12 gap-3 overflow-y-auto p-4" />

            <div class="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
              <BaseButton v-if="actionMethod" variant="light" size="sm" @click="handleActionAndClose">
                <RotateCcw class="h-4 w-4" aria-hidden="true" />
                {{ actionLabel }}
              </BaseButton>
              <BaseButton variant="primary" size="sm" @click="applyFilters"> Aplicar </BaseButton>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Bottom sheet: acciones -->
      <Teleport to="body">
        <div
          v-if="isActionsOpen"
          class="fixed inset-0 z-50 flex items-end bg-slate-950/40 backdrop-blur-[2px]"
          @click="closeActions"
        >
          <div
            class="sheet-enter flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Acciones"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span class="text-sm font-bold text-slate-900">Acciones</span>
              <button
                type="button"
                aria-label="Cerrar"
                class="rounded-full bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200"
                @click="closeActions"
              >
                <X class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div class="flex flex-col gap-2 overflow-y-auto p-4">
              <BaseButton v-if="actionMethod" variant="light" size="sm" @click="handleActionAndClose">
                <RotateCcw class="h-4 w-4" aria-hidden="true" />
                {{ actionLabel }}
              </BaseButton>
              <div class="flex flex-col gap-2 [&>*]:w-full" @click="closeActions">
                <slot name="actions" />
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.filter-top-row {
  position: relative;
  display: flex;
  align-items: flex-end;
  transition: padding-bottom 0.3s ease;
}

/* Expandido: el padding-bottom crece y los botones —anclados al borde del
   padding-box— se deslizan hacia abajo formando la segunda fila */
.filter-top-row.is-searching {
  padding-bottom: 50px;
}

.filter-primary-target {
  flex: 1 1 auto;
  min-width: 0;
  transition: margin-right 0.3s ease;
}

.filter-badges {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-badge-btn {
  position: relative;
  transition: all 0.3s ease-in-out;
}

/* El texto se expande/colapsa suavemente (nunca display:none directo) */
.filter-badge-text {
  display: inline-block;
  max-width: 90px;
  margin-left: 0.125rem;
  opacity: 1;
  overflow: hidden;
  white-space: nowrap;
  transition:
    max-width 0.3s ease,
    margin-left 0.3s ease,
    opacity 0.25s ease;
}

.filter-top-row:not(.is-searching) .filter-badge-text {
  max-width: 0;
  margin-left: 0;
  opacity: 0;
}

/* Colapsado: botones solo-icono */
.filter-top-row:not(.is-searching) .filter-badge-btn {
  width: 40px;
  min-width: 40px;
  padding: 0 !important;
}

/* Contador siempre flotante: no hay swap de posición al expandir/colapsar */
.badge-count {
  position: absolute;
  top: -6px;
  right: -6px;
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: white;
  color: #0f172a;
  box-shadow: 0 0 0 1px #e2e8f0;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0 0.3rem;
  z-index: 1;
}

.sheet-enter {
  animation: sheet-slide-up 0.25s ease;
  padding-bottom: env(safe-area-inset-bottom);
}

@keyframes sheet-slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
