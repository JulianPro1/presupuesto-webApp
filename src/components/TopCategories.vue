<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  ChartPie,
  Utensils,
  House,
  Zap,
  Car,
  HeartPulse,
  GraduationCap,
  Clapperboard,
  PartyPopper,
  Shapes,
} from 'lucide-vue-next';
import type { FunctionalComponent } from 'vue';
import { $byCategory, $stats } from '../stores/budgetStore';
import type { Category } from '../stores/budgetStore';
import { formatUsd, formatPct } from '../utils/formatters';

const CAT_META: Record<
  Category,
  { icon: FunctionalComponent; chip: string }
> = {
  Alimentación: {
    icon: Utensils,
    chip: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  },
  Vivienda: { icon: House, chip: 'bg-sky-50 text-sky-600 ring-sky-100' },
  Servicios: { icon: Zap, chip: 'bg-amber-50 text-amber-600 ring-amber-100' },
  Transporte: {
    icon: Car,
    chip: 'bg-violet-50 text-violet-600 ring-violet-100',
  },
  Salud: {
    icon: HeartPulse,
    chip: 'bg-rose-50 text-rose-600 ring-rose-100',
  },
  Educación: {
    icon: GraduationCap,
    chip: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  },
  Entretenimiento: {
    icon: Clapperboard,
    chip: 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100',
  },
  Ocio: {
    icon: PartyPopper,
    chip: 'bg-orange-50 text-orange-600 ring-orange-100',
  },
  Otros: { icon: Shapes, chip: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

const byCategory = useStore($byCategory);
const stats = useStore($stats);

const top = computed(() => byCategory.value.slice(0, 6));
</script>

<template>
  <article
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <h2 class="flex items-center gap-2 text-sm font-bold text-slate-900">
      <ChartPie class="h-4 w-4 text-rose-600" aria-hidden="true" />
      ¿En qué se va el dinero?
    </h2>
    <p class="mt-0.5 text-xs text-slate-500">
      Categorías con mayor gasto del mes
    </p>

    <p v-if="!top.length" class="mt-4 text-sm text-slate-400">
      Aún no registras gastos este mes.
    </p>

    <ul v-else class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="item in top"
        :key="item.category"
        class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition hover:border-slate-300 hover:bg-white"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1"
          :class="CAT_META[item.category].chip"
        >
          <component
            :is="CAT_META[item.category].icon"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-semibold text-slate-800">
            {{ item.category }}
          </p>
          <p class="mt-0.5 text-[10px] text-slate-400">
            {{ item.count }}
            {{ item.count === 1 ? 'gasto' : 'gastos' }} ·
            {{
              formatPct(
                stats.totalUsd > 0
                  ? (item.totalUsd / stats.totalUsd) * 100
                  : 0,
              )
            }}
          </p>
        </div>
        <p
          class="shrink-0 text-right text-xs font-bold whitespace-nowrap text-slate-900"
        >
          {{ formatUsd(item.totalUsd) }}
        </p>
      </li>
    </ul>
  </article>
</template>
