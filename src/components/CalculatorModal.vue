<script setup lang="ts">
import Modal from '@/components/common/layout/Modal.vue';
import CurrencyCalculator from '@/components/CurrencyCalculator.vue';
import type { ExpenseCurrency } from '../stores/budgetStore';

type Accent = 'rose' | 'emerald' | 'amber' | 'violet';

interface Props {
  open?: boolean;
  accent?: Accent;
}

withDefaults(defineProps<Props>(), {
  open: false,
  accent: 'emerald',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', payload: { value: number; currency: ExpenseCurrency }): void;
}>();
</script>

<template>
  <Modal :open="open" size="md" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-bold text-slate-900">
        Calculadora de divisas
      </h3>
    </template>

    <CurrencyCalculator
      in-modal
      :accent="accent"
      @apply="(payload) => { emit('apply', payload); emit('close'); }"
    />
  </Modal>
</template>
