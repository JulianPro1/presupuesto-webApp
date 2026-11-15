<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { Landmark, CircleDollarSign } from 'lucide-vue-next';
import { $rates } from '../stores/budgetStore';
import { formatVes } from '../utils/formatters';

const rates = useStore($rates);
</script>

<template>
  <div class="flex shrink-0 items-center gap-1">
    <span
      class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-sky-800 ring-1 ring-sky-200"
      title="Tasa oficial BCV (Bs./$)"
    >
      <Landmark class="h-3 w-3" aria-hidden="true" />
      BCV
      {{ formatVes(rates.bcv) }}
    </span>
    <span
      class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-emerald-800 ring-1 ring-emerald-200"
      title="Tasa USDT mercado P2P (Bs./$)"
    >
      <CircleDollarSign class="h-3 w-3" aria-hidden="true" />
      USDT
      {{ formatVes(rates.usdt) }}
    </span>
  </div>
</template>
