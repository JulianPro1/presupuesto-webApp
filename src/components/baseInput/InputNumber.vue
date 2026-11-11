<script setup lang="ts">
interface Props {
  id?: string
  modelValue?: string | number | null
  placeholder?: string
  disabled?: boolean
  isInvalid?: boolean
  step?: string
  min?: string | number
  max?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  isInvalid: false,
  step: '1',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [value: string]
}>()

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const onBlur = () => {
  emit('blur', String(props.modelValue ?? ''))
}
</script>

<template>
  <input
    :id="id"
    type="number"
    inputmode="decimal"
    class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-200 custom-input"
    :class="{ 'is-invalid': isInvalid }"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :step="step"
    :min="min"
    :max="max"
    @input="onInput"
    @blur="onBlur"
  />
</template>

<style scoped>
.custom-input {
  font-size: 0.95rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background-color: #ffffff;
  color: #111827;
  box-shadow: none;
}

/* Ocultar flechas de incremento/decremento en Chrome/Safari/Edge */
.custom-input::-webkit-outer-spin-button,
.custom-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Ocultar flechas en Firefox y estándar */
.custom-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.custom-input::placeholder {
  color: #6b7280;
  font-size: 0.95rem;
}

.custom-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.1);
}

.is-invalid {
  border-color: #dc3545 !important;
}
</style>
