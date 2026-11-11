<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  id?: string
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  open?: boolean
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  open: undefined,
  modelValue: undefined,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:open', val: boolean): void
  (e: 'update:modelValue', val: boolean): void
}>()

const visible = ref(false)

// Sincronizar si se usa en modo controlado mediante :open o v-model
watch(
  () => (props.open !== undefined ? props.open : props.modelValue),
  (val) => {
    if (val !== undefined) {
      visible.value = val
    }
  },
  { immediate: true },
)

// El Teleport no puede existir durante SSR/hidratación dentro de una isla
// de Astro: Vue barre el DOM buscando anchors y elimina elementos hermanos.
const mounted = ref(false)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) {
    closeModal()
  }
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'max-w-sm'
    case 'lg':
      return 'max-w-lg'
    case 'xl':
      return 'max-w-2xl'
    case 'md':
    default:
      return 'max-w-md'
  }
})

function openModal() {
  visible.value = true
  emit('update:open', true)
  emit('update:modelValue', true)
}

function closeModal() {
  visible.value = false
  emit('close')
  emit('update:open', false)
  emit('update:modelValue', false)
}

defineExpose({ openModal, closeModal })
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <transition name="modal-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
        @click.self="closeModal"
      >
        <div
          :id="id"
          role="dialog"
          aria-modal="true"
          class="w-full rounded-2xl bg-white p-5 shadow-xl"
          :class="sizeClass"
        >
          <div v-if="title || $slots.header" class="mb-4 flex items-center justify-between">
            <slot name="header">
              <h3 class="text-base font-bold text-slate-900">{{ title }}</h3>
            </slot>
            <button
              type="button"
              aria-label="Cerrar"
              class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              @click="closeModal"
            >
              <X class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <slot />
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
