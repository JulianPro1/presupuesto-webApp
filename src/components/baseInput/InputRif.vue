<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  id?: string
  modelValue?: string | number | null
  placeholder?: string
  disabled?: boolean
  isInvalid?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  isInvalid: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [value: string]
}>()

const prefixes = ['V-', 'E-']

const selectedPrefix = ref('V-')
const numericPart = ref('')

const parseRif = (value: string | number | null | undefined): { prefix: string; numbers: string } => {
  const v = String(value ?? '')
  const matched = prefixes.find((p) => v.startsWith(p))
  if (matched) {
    return { prefix: matched, numbers: v.slice(matched.length).replace(/\D/g, '') }
  }
  return { prefix: 'V-', numbers: v.replace(/\D/g, '') }
}

const formattedValue = (): string =>
  numericPart.value ? `${selectedPrefix.value}${numericPart.value}` : ''

const emitFormatted = () => {
  emit('update:modelValue', formattedValue())
}

watch(
  () => props.modelValue,
  (newVal) => {
    const { prefix, numbers } = parseRif(newVal)
    selectedPrefix.value = prefix
    numericPart.value = numbers
  },
  { immediate: true },
)

const onPrefixChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  selectedPrefix.value = target.value
  emitFormatted()
}

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '')
  if (target.value !== digits) {
    target.value = digits
  }
  numericPart.value = digits
  emitFormatted()
}

const onBlur = () => {
  emit('blur', formattedValue())
}
</script>

<template>
  <div class="flex">
    <select
      class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-200 appearance-none border-r-0 grow-0 custom-select"
      style="width: 85px"
      :value="selectedPrefix"
      :disabled="disabled"
      @change="onPrefixChange"
    >
      <option v-for="p in prefixes" :key="p" :value="p">{{ p }}</option>
    </select>
    <input
      :id="id"
      type="text"
      class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-200 custom-input"
      :class="{ 'is-invalid': isInvalid }"
      :placeholder="placeholder"
      :value="numericPart"
      :disabled="disabled"
      @input="onInput"
      @blur="onBlur"
    />
  </div>
</template>

<style scoped>
.custom-input,
.custom-select {
  font-size: 0.95rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background-color: #ffffff;
  color: #111827;
  box-shadow: none;
}

.custom-input::placeholder {
  color: #6b7280;
  font-size: 0.95rem;
}

.custom-input:focus,
.custom-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.1);
}

.custom-select {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  padding: 0.8rem 0.6rem;
}

.custom-select + .custom-input {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.is-invalid {
  border-color: #dc3545 !important;
}
</style>
