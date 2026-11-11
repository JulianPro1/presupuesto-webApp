<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

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

const inputRef = ref<HTMLInputElement | null>(null)
const displayValue = ref('')
const numericValue = ref(0)
const digitsOnly = ref('')
const isInternalUpdate = ref(false)

/**
 * Formatea un número a string con separadores de miles y 2 decimales.
 * Ej: 1500.5 -> "1,500.50"
 */
const formatCurrencyNumber = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) return ''
  const [intPart, decPart] = num.toFixed(2).split('.')
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decPart}`
}

/**
 * Lógica de caja registradora: los últimos 2 dígitos son los decimales.
 * Ej: "150" -> { formatted: "1.50", numeric: 1.50 }
 *     "1"   -> { formatted: "0.01", numeric: 0.01 }
 */
const formatFromDigits = (digits: string): { formatted: string; numeric: number } => {
  const stripped = digits.replace(/^0+/, '')

  if (stripped === '') {
    return { formatted: '0.00', numeric: 0 }
  }

  if (stripped.length === 1) {
    const numeric = parseFloat(`0.0${stripped}`)
    return { formatted: `0.0${stripped}`, numeric }
  } else if (stripped.length === 2) {
    const numeric = parseFloat(`0.${stripped}`)
    return { formatted: `0.${stripped}`, numeric }
  } else {
    const intPart = stripped.slice(0, -2)
    const decPart = stripped.slice(-2)
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const formatted = `${formattedInt}.${decPart}`
    const numeric = parseFloat(`${intPart}.${decPart}`)
    return { formatted, numeric }
  }
}

/**
 * Emite '' cuando el valor es 0 para preservar la lógica de los forms
 * que usan `!== ''` para validar exclusión mutua y campos vacíos.
 */
const emitValue = (numeric: number) => {
  emit('update:modelValue', numeric === 0 ? '' : String(numeric))
}

const syncFromExternal = (value: string | number | null | undefined) => {
  const incoming =
    value !== null && value !== undefined && value !== ''
      ? parseFloat(String(value).replace(/,/g, ''))
      : 0

  if (!isNaN(incoming)) {
    displayValue.value = formatCurrencyNumber(incoming)
    numericValue.value = incoming
    digitsOnly.value = incoming === 0 ? '' : String(Math.round(incoming * 100))
  } else {
    displayValue.value = '0.00'
    numericValue.value = 0
    digitsOnly.value = ''
  }
}

onMounted(() => {
  syncFromExternal(props.modelValue)
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (isInternalUpdate.value) return
    syncFromExternal(newVal)
  },
)

const onInput = (event: Event) => {
  const inputEvent = event as InputEvent
  isInternalUpdate.value = true

  const isDelete =
    inputEvent.inputType === 'deleteContentBackward' ||
    inputEvent.inputType === 'deleteContentForward'

  if (isDelete) {
    // Borrar último dígito
    digitsOnly.value = digitsOnly.value.slice(0, -1)
  } else {
    // Extraer todos los dígitos del valor actual del input
    const allDigits = (event.target as HTMLInputElement).value.replace(/[^0-9]/g, '')
    digitsOnly.value = allDigits
  }

  // Normalizar: remover ceros iniciales múltiples.
  // Solo se conserva un "0" si es el único dígito.
  // Ej: "000" -> "", "005" -> "5", "050" -> "50", "0" -> "0"
  digitsOnly.value = digitsOnly.value.replace(/^0+(?=\d)/, '')

  const { formatted, numeric } = formatFromDigits(digitsOnly.value)
  displayValue.value = formatted
  numericValue.value = numeric
  emitValue(numeric)

  nextTick(() => {
    if (inputRef.value) {
      // Forzar el valor del DOM por si displayValue no cambió (ej: "0.00" → "0.00")
      // y Vue no re-renderizó, evitando que el input muestre el texto crudo del usuario
      inputRef.value.value = formatted
      inputRef.value.setSelectionRange(formatted.length, formatted.length)
    }
    isInternalUpdate.value = false
  })
}

const onFocus = () => {
  if (inputRef.value) {
    nextTick(() => {
      requestAnimationFrame(() => {
        if (inputRef.value) {
          const length = inputRef.value.value.length
          inputRef.value.setSelectionRange(length, length)
        }
      })
    })
  }
}

const onBlur = () => {
  if (numericValue.value === null || numericValue.value === undefined || numericValue.value === 0) {
    displayValue.value = '0.00'
    numericValue.value = 0
    emitValue(0)
  }
  emit('blur', numericValue.value === 0 ? '' : String(numericValue.value))
}
</script>

<template>
  <input
    ref="inputRef"
    :id="id"
    type="text"
    inputmode="numeric"
    class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-200 custom-input text-right"
    :class="{ 'custom-invalid': isInvalid }"
    :value="displayValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="onInput"
    @focus="onFocus"
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

.custom-input::placeholder {
  color: #6b7280;
  font-size: 0.95rem;
}

.custom-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.1);
}

.custom-invalid {
  border-color: #dc3545 !important;
  /* Sin icono de exclamación ni padding extra de Bootstrap */
  background-image: none;
  padding-right: 1.2rem;
}

.custom-invalid:focus {
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.1);
}
</style>
