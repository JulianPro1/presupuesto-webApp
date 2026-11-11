<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from '@nanostores/vue';
import { X, Landmark, CircleDollarSign, TrendingUp } from 'lucide-vue-next';
import { $rates, setRates } from '../stores/budgetStore';
import { formatPct, parseAmount } from '../utils/formatters';
import { useSwalToast } from '@/composables/ui/useSwalToast';
import BaseInput from '@/components/BaseInput.vue';

const { showSuccess, showError } = useSwalToast();

interface Props {
  open: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const rates = useStore($rates);

// El Teleport no puede existir durante SSR/hidratación dentro de una isla
// de Astro: Vue barre el DOM buscando anchors y elimina elementos hermanos.
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const bcvInput = ref('');
const usdtInput = ref('');

// Precargar las tasas actuales cada vez que se abre el modal
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    bcvInput.value = rates.value.bcv > 0 ? String(rates.value.bcv) : '';
    usdtInput.value = rates.value.usdt > 0 ? String(rates.value.usdt) : '';
  },
);

const previewSpread = computed(() => {
  const bcv = parseAmount(bcvInput.value);
  const usdt = parseAmount(usdtInput.value);
  return bcv > 0 ? ((usdt - bcv) / bcv) * 100 : 0;
});

function close() {
  emit('close');
}

function save() {
  const bcv = parseAmount(bcvInput.value);
  const usdt = parseAmount(usdtInput.value);

  const patch: { bcv?: number; usdt?: number } = {};
  if (bcv > 0) patch.bcv = bcv;
  if (usdt > 0) patch.usdt = usdt;

  if (!patch.bcv && !patch.usdt) {
    showError('Ingresa al menos una tasa mayor a cero');
    return;
  }

  setRates(patch);
  showSuccess('Tasas cargadas manualmente');
  close();
}
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
        @click.self="close"
        @keydown.esc="close"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rates-modal-title"
          class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        >
          <div class="mb-1 flex items-center justify-between">
            <h3
              id="rates-modal-title"
              class="flex items-center gap-2 text-base font-bold text-slate-900"
            >
              <TrendingUp class="h-5 w-5 text-sky-600" aria-hidden="true" />
              Tasa manual
            </h3>
            <button
              type="button"
              aria-label="Cerrar"
              class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              @click="close"
            >
              <X class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p class="mb-4 text-xs text-slate-500">
            Úsala si el stream aún no emite o quieres registrar gastos con una
            tasa proyectada. Solo se actualizan los campos que completes.
          </p>

          <div class="flex flex-col gap-4">
            <BaseInput
              id="modal-rate-bcv"
              v-model="bcvInput"
              type="currency"
              label="Tasa BCV (Bs./$)"
              placeholder="0,00"
            >
              <template #label-right>
                <Landmark class="h-4 w-4 text-sky-600" aria-hidden="true" />
              </template>
            </BaseInput>
            <BaseInput
              id="modal-rate-usdt"
              v-model="usdtInput"
              type="currency"
              label="Tasa USDT (Bs./$)"
              placeholder="0,00"
            >
              <template #label-right>
                <CircleDollarSign
                  class="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
              </template>
            </BaseInput>
          </div>

          <p
            v-if="previewSpread !== 0"
            class="mt-3 text-xs font-semibold text-slate-500"
          >
            Brecha resultante:
            <span
              :class="
                previewSpread <= 2
                  ? 'text-emerald-600'
                  : previewSpread <= 8
                    ? 'text-amber-600'
                    : 'text-rose-600'
              "
            >
              {{ previewSpread > 0 ? '+' : '' }}{{ formatPct(previewSpread) }}
            </span>
          </p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
              @click="save"
            >
              Aplicar tasas
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active > div,
.modal-fade-leave-active > div {
  transition: transform 0.2s ease;
}
.modal-fade-enter-from > div,
.modal-fade-leave-to > div {
  transform: translateY(8px) scale(0.98);
}
</style>
