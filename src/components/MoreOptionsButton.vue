<script setup lang="ts">
import { ref } from 'vue';
import { EllipsisVertical } from 'lucide-vue-next';
import MoreOptionsModal from '@/components/MoreOptionsModal.vue';

interface Props {
  /** Variante compacta (solo ícono) para el header móvil */
  compact?: boolean;
}

withDefaults(defineProps<Props>(), { compact: false });

const open = ref(false);
</script>

<template>
  <button
    v-bind="$attrs"
    type="button"
    aria-label="Más opciones"
    class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-100/80 text-slate-600 transition hover:bg-white hover:text-slate-900"
    :class="compact ? 'h-9 w-9' : 'h-9 px-3 text-[11px] font-semibold sm:text-xs'"
    @click="open = true"
  >
    <EllipsisVertical class="h-4 w-4 shrink-0" aria-hidden="true" />
    <span v-if="!compact">Más opciones</span>
  </button>

  <MoreOptionsModal :open="open" @close="open = false" />
</template>
