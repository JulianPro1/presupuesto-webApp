<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useFormValidation } from '@/composables/forms/useFormValidation'
import InputRif from '@/components/baseInput/InputRif.vue'
import InputPassword from '@/components/baseInput/InputPassword.vue'
import InputText from '@/components/baseInput/InputText.vue'
import InputEmail from '@/components/baseInput/InputEmail.vue'
import InputNumber from '@/components/baseInput/InputNumber.vue'
import InputCurrency from '@/components/baseInput/InputCurrency.vue'
import InputDate from '@/components/baseInput/InputDate.vue'
import InputTime from '@/components/baseInput/InputTime.vue'

interface Props {
  modelValue?: string | number | null
  type?: 'text' | 'rif' | 'password' | 'email' | 'number' | 'currency' | 'date' | 'time' | string
  label?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  rules?: Array<(val: any) => string | boolean>
  autocomplete?: string
  maxLength?: number
  step?: string
  min?: string | number
  max?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  label: '',
  placeholder: '',
  disabled: false,
  rules: () => [],
  autocomplete: 'on',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [value: string | number]
}>()

// Integración con el sistema global de validación del formulario
const formValidation = useFormValidation()

const internalErrors = ref<string[]>([])
const isPasswordVisible = ref(false)
const internalValue = ref<string | number | null>(props.modelValue ?? '')

const hasError = computed(() => internalErrors.value.length > 0)

const validate = (value: any, silent = false) => {
  if (!props.rules || props.rules.length === 0) {
    if (!silent) {
      internalErrors.value = []
    }
    if (formValidation && props.id) {
      formValidation.updateFieldStatus(props.id, false)
    }
    return true
  }

  const errors: string[] = []
  for (const rule of props.rules) {
    const result = rule(value)
    if (typeof result === 'string') {
      errors.push(result)
    } else if (result === false) {
      errors.push('Campo inválido')
    }
  }

  if (!silent) {
    internalErrors.value = errors
  }

  const isValid = errors.length === 0
  if (formValidation && props.id) {
    formValidation.updateFieldStatus(props.id, !isValid)
  }
  return isValid
}

if (formValidation) {
  onMounted(() => {
    if (props.id) {
      formValidation.registerField(props.id, () => validate(internalValue.value))
      validate(internalValue.value, true)
    }
  })

  onUnmounted(() => {
    if (props.id) {
      formValidation.unregisterField(props.id)
    }
  })
}

// Sincronizar valor interno cuando cambia desde fuera
watch(
  () => props.modelValue,
  (newVal) => {
    internalValue.value = newVal ?? ''
    validate(newVal, internalErrors.value.length === 0)
  },
)

// Revalidar cuando las reglas cambian sin mostrar errores si el usuario aún no ha interactuado
watch(
  () => props.rules,
  () => validate(internalValue.value, internalErrors.value.length === 0),
)

const updateValue = (value: string) => {
  internalValue.value = value
  emit('update:modelValue', value)
  validate(value)
}

const onBlurValue = (value: string) => {
  validate(value)
  emit('blur', value)
}

const togglePasswordVisibility = () => {
  if (props.disabled) return
  isPasswordVisible.value = !isPasswordVisible.value
}
</script>

<template>
  <div class="form-group-custom">
    <label v-if="label" :for="id" class="block text-sm font-semibold text-slate-700 mb-1 flex justify-between items-center">
      {{ label }}
      <slot name="label-right"></slot>
    </label>

    <InputRif
      v-if="type === 'rif'"
      :id="id"
      :model-value="internalValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      @update:model-value="updateValue"
      @blur="onBlurValue"
    />

    <InputPassword
      v-else-if="type === 'password'"
      :id="id"
      :model-value="internalValue"
      :is-password-visible="isPasswordVisible"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      @update:model-value="updateValue"
      @blur="onBlurValue"
      @toggle-visibility="togglePasswordVisibility"
    />

    <InputEmail
      v-else-if="type === 'email'"
      :id="id"
      :model-value="internalValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      :autocomplete="autocomplete"
      @update:model-value="updateValue"
      @blur="onBlurValue"
    />

    <InputNumber
      v-else-if="type === 'number'"
      :id="id"
      :model-value="internalValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      :step="step"
      :min="min"
      :max="max"
      @update:model-value="updateValue"
      @blur="onBlurValue"
    />

    <InputCurrency
      v-else-if="type === 'currency'"
      :id="id"
      :model-value="internalValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      @update:model-value="updateValue"
      @blur="onBlurValue"
    />

    <InputDate
      v-else-if="type === 'date'"
      :id="id"
      :model-value="internalValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      @update:model-value="updateValue"
      @blur="onBlurValue"
    />

    <InputTime
      v-else-if="type === 'time'"
      :id="id"
      :model-value="internalValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      @update:model-value="updateValue"
      @blur="onBlurValue"
    />

    <InputText
      v-else
      :id="id"
      :model-value="internalValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :is-invalid="hasError"
      :autocomplete="autocomplete"
      :max-length="maxLength"
      @update:model-value="updateValue"
      @blur="onBlurValue"
    />

    <transition name="fade">
      <div v-if="internalErrors.length > 0" class="errors-wrapper">
        <div class="errors-wrapper-inner">
          <transition-group
            name="list"
            tag="div"
            class="invalid-feedback block mt-1 errors-container"
          >
            <div v-for="error in internalErrors" :key="error" class="error-item">• {{ error }}</div>
          </transition-group>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.form-group-custom label {
  font-size: 0.9rem;
}

.errors-wrapper {
  position: relative;
  display: grid;
  grid-template-rows: 1fr;
}

.errors-wrapper-inner {
  min-height: 0;
  overflow: hidden;
}

.errors-container {
  max-height: 3.2em;
  overflow-y: scroll;
  scrollbar-width: thin;
  scrollbar-color: #fca5a5 #f9fafb;
  padding-right: 4px;
}

.errors-container::-webkit-scrollbar {
  -webkit-appearance: none;
  width: 6px;
}
.errors-container::-webkit-scrollbar-track {
  background: #f9fafb;
  border-radius: 4px;
}
.errors-container::-webkit-scrollbar-thumb {
  background-color: #fca5a5;
  border-radius: 4px;
  border: 1px solid #f9fafb;
}

.error-item {
  line-height: 1.4em;
  margin-bottom: 4px;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  overflow: hidden;
  max-height: 5em;
}
.error-item:last-child {
  margin-bottom: 0;
}

.invalid-feedback {
  font-size: 0.875em;
  color: #dc3545;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
  grid-template-rows: 0fr;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
  max-height: 0;
  margin-bottom: 0;
}
</style>
