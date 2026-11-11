<script setup lang="ts">
interface Props {
  value: boolean | null | undefined
  activeLabel?: string
  inactiveLabel?: string
}

withDefaults(defineProps<Props>(), {
  activeLabel: 'Activo',
  inactiveLabel: 'Inactivo',
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="value
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-rose-50 text-rose-700'"
  >
    {{ value ? activeLabel : inactiveLabel }}
  </span>
</template>
