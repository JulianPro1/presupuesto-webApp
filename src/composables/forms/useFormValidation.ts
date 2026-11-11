import {
  computed,
  inject,
  provide,
  reactive,
  type ComputedRef,
  type InjectionKey,
} from 'vue';

export interface FormValidationRegistry {
  registerField: (id: string, validate: () => boolean) => void;
  unregisterField: (id: string) => void;
  updateFieldStatus: (id: string, hasError: boolean) => void;
  validateAll: () => boolean;
  hasErrors: ComputedRef<boolean>;
  fieldsWithErrors: ComputedRef<string[]>;
}

const FORM_VALIDATION_KEY: InjectionKey<FormValidationRegistry> =
  Symbol('form-validation');

/**
 * Llamar en el componente padre del formulario para crear y proveer
 * el registro de validación a todos los inputs hijos.
 */
export function provideFormValidation(): FormValidationRegistry {
  const validators = new Map<string, () => boolean>();
  const errorStatus = reactive<Record<string, boolean>>({});

  const registry: FormValidationRegistry = {
    registerField: (id, validate) => {
      validators.set(id, validate);
    },
    unregisterField: (id) => {
      validators.delete(id);
      delete errorStatus[id];
    },
    updateFieldStatus: (id, hasError) => {
      errorStatus[id] = hasError;
    },
    validateAll: () => {
      let allValid = true;
      for (const validate of validators.values()) {
        if (!validate()) allValid = false;
      }
      return allValid;
    },
    hasErrors: computed(() => Object.values(errorStatus).some(Boolean)),
    fieldsWithErrors: computed(() =>
      Object.keys(errorStatus).filter((id) => errorStatus[id]),
    ),
  };

  provide(FORM_VALIDATION_KEY, registry);
  return registry;
}

/**
 * Llamar dentro de un input para conectarse al formulario padre.
 * Retorna null si el input no está dentro de un formulario proveedor.
 */
export function useFormValidation(): FormValidationRegistry | null {
  return inject(FORM_VALIDATION_KEY, null);
}
