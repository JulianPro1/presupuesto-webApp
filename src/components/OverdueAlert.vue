<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { TriangleAlert, ArrowRight } from 'lucide-vue-next';
import { $overduePayables } from '../stores/budgetStore';
import { formatUsd } from '../utils/formatters';
import { useDateFormat } from '@/composables/ui/useDateFormat';

const overdue = useStore($overduePayables);
const { formatDateFriendly } = useDateFormat();
</script>

<template>
  <div
    v-if="overdue.count > 0"
    role="alert"
    class="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
  >
    <TriangleAlert
      class="h-5 w-5 shrink-0 text-rose-600"
      aria-hidden="true"
    />
    <p class="min-w-0 flex-1 text-xs text-rose-800 sm:text-sm">
      <span class="font-bold"
        >{{ overdue.count }} cuenta(s) por pagar vencida(s)</span
      >
      por {{ formatUsd(overdue.usd) }}
      <template v-if="overdue.nextDue">
        · próxima a vencer: {{ formatDateFriendly(overdue.nextDue) }}
      </template>
    </p>
    <a
      href="/por-pagar/List"
      class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-white transition hover:bg-rose-700"
    >
      Revisar
      <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  </div>
</template>
