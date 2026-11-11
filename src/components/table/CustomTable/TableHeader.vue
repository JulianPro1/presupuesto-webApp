<template>
  <thead class="bg-slate-50 sticky-header">
    <tr>
      <th
        v-for="header in headers"
        :key="header.key"
        class="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
      >
        {{ header.label }}
      </th>
      <th
        v-if="hasActions"
        class="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
      >
        Acciones
      </th>
    </tr>
  </thead>
</template>

<script setup lang="ts">
interface Header {
  key: string
  label: string
}

defineProps<{
  headers: Header[]
  hasActions: boolean
}>()
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
