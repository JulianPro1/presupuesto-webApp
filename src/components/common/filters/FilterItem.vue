<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { Ref } from 'vue';

interface Props {
  label?: string;
  /** Clases de grid de Tailwind, ej. 'col-span-12 md:col-span-4' */
  cols?: string;
  /** En mobile, permanece siempre visible en la barra (no va al sheet de Filtros) */
  primary?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  cols: 'col-span-12 md:col-span-4',
  primary: false,
});

interface FilterRowContext {
  isMobile: Ref<boolean>;
  isFiltersOpen: Ref<boolean>;
  forcePrimary: Ref<boolean>;
  filtersTarget: string;
}

const ctx = inject<FilterRowContext | null>('filter-row-context', null);

const isMobile = ctx?.isMobile ?? ref(false);
const isFiltersOpen = ctx?.isFiltersOpen ?? ref(false);
const forcePrimary = ctx?.forcePrimary ?? ref(false);
const filtersTarget = ctx?.filtersTarget ?? '#filter-filters-target';

const isPrimary = computed(() => props.primary || forcePrimary.value);
</script>

<template>
  <div v-if="!isMobile" :class="[cols, 'filter-item', { 'filter-item--primary': isPrimary }]">
    <label v-if="label" class="mb-1 block text-sm font-semibold text-slate-700">
      {{ label }}
    </label>
    <slot />
  </div>

  <div v-else-if="isPrimary" class="filter-item filter-item--primary-mobile w-full">
    <label v-if="label" class="mb-1 block text-sm font-semibold text-slate-700">
      {{ label }}
    </label>
    <slot />
  </div>

  <Teleport v-else-if="isFiltersOpen" :to="filtersTarget">
    <div :class="[cols, 'filter-item filter-item--secondary-mobile']">
      <label v-if="label" class="mb-1 block text-sm font-semibold text-slate-700">
        {{ label }}
      </label>
      <slot />
    </div>
  </Teleport>
</template>
