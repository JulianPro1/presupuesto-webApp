<script setup lang="ts">
import { computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

interface Props {
  id?: string
  modelValue?: string | number | null
  isPasswordVisible?: boolean
  placeholder?: string
  disabled?: boolean
  isInvalid?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  isPasswordVisible: false,
  placeholder: '',
  disabled: false,
  isInvalid: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [value: string]
  'toggle-visibility': []
}>()

const inputType = computed(() => (props.isPasswordVisible ? 'text' : 'password'))

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const onBlur = () => {
  emit('blur', String(props.modelValue ?? ''))
}
</script>

<template>
  <div class="flex">
    <input
      :id="id"
      :type="inputType"
      class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-200"
      :class="{
        'is-invalid': isInvalid,
        'border-r-0': !isInvalid,
        'custom-input': true,
      }"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="onInput"
      @blur="onBlur"
    />

    <span
      class="px-3 py-2 border border-slate-300 rounded-lg bg-white custom-input-icon"
      :class="{
        'border-l-0': !isInvalid,
        'border-rose-500': isInvalid,
      }"
    >
      <button
        class="p-0 text-slate-500 no-underline"
        type="button"
        @click="emit('toggle-visibility')"
        tabindex="-1"
        :disabled="disabled"
      >
        <EyeOff v-if="isPasswordVisible" />
        <Eye v-else />
      </button>
    </span>
  </div>
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

.custom-input::placeholder {
  color: #6b7280;
  font-size: 0.95rem;
}

.custom-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.1);
}

.custom-input-icon {
  border: 1px solid #e5e7eb;
  border-radius: 0 10px 10px 0;
  background-color: #ffffff;
}

.custom-input.border-r-0 {
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.custom-input-icon.border-l-0 {
  border-left: none;
}

.custom-input-icon button {
  color: #9ca3af;
}
.custom-input-icon button:focus,
.custom-input-icon button:hover {
  color: #4b5563;
  outline: none;
  box-shadow: none;
}

.is-invalid {
  border-color: #dc3545 !important;
}
</style>
