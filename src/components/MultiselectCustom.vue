<template>
  <div class="multiselect-wrapper">
    <!-- Label — mirrors SearchInput's label row -->
    <div v-if="label" class="flex items-center mb-1">
      <label class="block text-sm font-medium text-slate-700 mb-0 font-bold multiselect-label">{{ label }}</label>
    </div>

    <div class="multiselect-container">
      <Multiselect
        :model-value="modelValue"
        @update:model-value="handleUpdate"
        @close="handleClose"
        :options="options"
        :placeholder="placeholder"
        :track-by="computedTrackBy"
        :label="computedLabel"
        :close-on-select="props.closeOnSelect"
        :clear-on-select="defaultProps.clearOnSelect"
        :searchable="defaultProps.searchable"
        :allow-empty="props.allowEmpty"
        :multiple="multiple"
        :class="[
          defaultClasses.container,
          variant ? `multiselect-${variant}` : '',
          { 'is-invalid': internalErrors.length > 0 },
        ]"
        v-bind="$attrs"
      >
        <!-- Slot para opciones personalizadas -->
        <template #option="{ option }" v-if="effectiveShowIcons">
          <div :class="defaultClasses.option">
            <div :class="defaultClasses.iconContainer">
              <i :class="[getIcon(option[iconKey]), defaultClasses.icon]"></i>
            </div>
            <div :class="defaultClasses.content">
              <div :class="defaultClasses.title">{{ option[labelKey] }}</div>
              <small :class="defaultClasses.description" v-if="showDescriptions">
                {{ getDescription(option[iconKey], option) }}
              </small>
            </div>
          </div>
        </template>

        <!-- Slot para label seleccionado -->
        <template #singleLabel="{ option }" v-if="effectiveShowIcons">
          <div :class="defaultClasses.singleLabel">
            <i :class="[getIcon(option[iconKey]), defaultClasses.singleIcon]"></i>
            <span :class="defaultClasses.singleTitle">{{ option[labelKey] }}</span>
          </div>
        </template>

        <!-- Pasar otros slots al componente padre -->
        <template v-for="(_, slot) in $slots" #[slot]="scope" :key="slot">
          <slot :name="slot" v-bind="scope" />
        </template>
      </Multiselect>

      <!-- Clear button — mirrors SearchInput's clear-wrap -->
      <transition name="ms-fade">
        <button
          v-if="clearable && modelValue !== null && modelValue !== undefined"
          class="multiselect-clear-btn"
          type="button"
          tabindex="-1"
          title="Limpiar selección"
          @click.stop="handleClear"
        >
          <X />
        </button>
      </transition>
    </div>

    <!-- Errors -->
    <transition name="fade">
      <div v-if="internalErrors.length > 0" class="errors-wrapper w-full mt-1">
        <div class="errors-wrapper-inner">
          <transition-group
            name="list"
            tag="div"
            class="invalid-feedback block mt-0 errors-container"
          >
            <div v-for="error in internalErrors" :key="error" class="error-item">• {{ error }}</div>
          </transition-group>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import Multiselect from 'vue-multiselect'
import { useMultiselectDefaults, useRoleHelpers } from '@/composables/ui/useMultiselect'
import { useFormValidation } from '@/composables/forms/useFormValidation'
import { X } from 'lucide-vue-next'

interface Props {
  modelValue?: any
  options: any[]
  placeholder?: string
  multiple?: boolean
  showIcons?: boolean
  showDescriptions?: boolean
  iconKey?: string
  labelKey?: string
  trackBy?: string
  variant?: 'success' | 'warning' | 'danger' | 'primary'
  helperType?: 'roles' | 'custom'
  customIconMap?: Record<string, string>
  customDescriptionMap?: Record<string, string>
  descriptionProp?: string
  customDefaultIcon?: string
  /** Label rendered above the select — same style as SearchInput */
  label?: string
  /** Show an animated × button to clear the selection */
  clearable?: boolean
  /** Close the dropdown after selecting an option (default true) */
  closeOnSelect?: boolean
  /** Allow the user to remove all selected options and leave the field empty */
  allowEmpty?: boolean
  rules?: Array<(val: any) => string | boolean>
  /** Identificador único del campo para integración con useFormValidation */
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Seleccionar opción',
  multiple: false,
  showIcons: true,
  showDescriptions: true,
  iconKey: 'name',
  labelKey: 'name',
  helperType: 'custom',
  label: '',
  clearable: false,
  closeOnSelect: true,
  allowEmpty: true,
  rules: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  /** Emitted when the user clicks the clear (×) button */
  clear: []
}>()

const { defaultProps, defaultClasses } = useMultiselectDefaults()

const isObjectOptions = computed(() => {
  return props.options.length > 0 && typeof props.options[0] === 'object' && props.options[0] !== null
})

const computedTrackBy = computed(() => {
  if (props.trackBy !== undefined) return props.trackBy
  return isObjectOptions.value ? defaultProps.trackBy : undefined
})

const computedLabel = computed(() => {
  if (props.labelKey !== undefined && props.labelKey !== 'name') return props.labelKey
  return isObjectOptions.value ? defaultProps.label : undefined
})

const effectiveShowIcons = computed(() => {
  return props.showIcons && isObjectOptions.value
})

const internalErrors = ref<string[]>([])

// ID único para integración con el sistema de validación global
const fieldId = props.id || Math.random().toString(36).slice(2, 9)

// Integración con el sistema global de validación del formulario
const formValidation = useFormValidation()

if (formValidation) {
  onMounted(() => {
    formValidation.registerField(fieldId, () => validate(props.modelValue))
    validate(props.modelValue, true)
  })

  onUnmounted(() => {
    formValidation.unregisterField(fieldId)
  })
}

const validate = (value: any, silent = false) => {
  if (!props.rules || props.rules.length === 0) {
    if (!silent) {
      internalErrors.value = []
    }
    if (formValidation) {
      formValidation.updateFieldStatus(fieldId, false)
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
  if (formValidation) {
    formValidation.updateFieldStatus(fieldId, !isValid)
  }
  return isValid
}

watch(
  () => props.modelValue,
  (newVal) => {
    validate(newVal, internalErrors.value.length === 0)
  },
)

const handleUpdate = (value: any) => {
  emit('update:modelValue', value)
  validate(value)
}

const handleClose = () => {
  validate(props.modelValue)
}

const handleClear = () => {
  emit('update:modelValue', null)
  emit('clear')
  validate(null)
}

// Configurar helpers según el tipo
const getIcon = (key: string): string => {
  if (props.helperType === 'roles') {
    return useRoleHelpers().getRoleIcon(key)
  }
  if (props.helperType === 'custom' && props.customIconMap) {
    return props.customIconMap[key] || props.customDefaultIcon || 'circle'
  }
  return props.customDefaultIcon || 'circle'
}

const getDescription = (key: string, option?: any): string => {
  if (props.helperType === 'roles') {
    return useRoleHelpers().getRoleDescription(key)
  }
  if (props.helperType === 'custom' && props.customDescriptionMap) {
    return props.customDescriptionMap[key] || ''
  }
  if (props.descriptionProp && option && option[props.descriptionProp]) {
    return option[props.descriptionProp]
  }
  return ''
}
</script>

<style>
@import 'vue-multiselect/dist/vue-multiselect.min.css';
@import '@/styles/multiselect-custom.css';
</style>

<style scoped>
.multiselect-wrapper {
  width: 100%;
}

.multiselect-label {
  font-size: 0.9rem;
}

/* Position the clear button over the right side of the select */
.multiselect-container {
  position: relative;
  display: flex;
  align-items: center;
}

.multiselect-container :deep(.multiselect) {
  flex: 1;
  /* Leave room for the clear button when visible */
}

.multiselect-clear-btn {
  position: absolute;
  right: 3rem; /* sits just before the caret arrow (which is now 3rem wide) */
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0 0.4rem;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
  z-index: 10;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  border-radius: 4px;
}

.multiselect-clear-btn:hover {
  color: #6b7280;
  background: rgba(0, 0, 0, 0.04);
}

/* Fade transition — identical to SearchInput */
.ms-fade-enter-active,
.ms-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.ms-fade-enter-from,
.ms-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-50%);
}

/* BaseInput error styles */
.invalid-feedback {
  font-size: 0.875em;
  color: #dc3545;
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

.multiselect-container :deep(.is-invalid) {
  border: 1px solid #dc3545 !important;
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
