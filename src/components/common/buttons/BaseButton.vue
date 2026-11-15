<script setup lang="ts">
interface Props {
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'light' | 'dark' | 'primary';
  size?: 'sm' | 'md';
}

withDefaults(defineProps<Props>(), {
  type: 'button',
  disabled: false,
  variant: 'light',
  size: 'md',
});

defineEmits<{ (e: 'click', ev: MouseEvent): void }>();

const VARIANT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  light:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:hover:bg-white',
  dark: 'border border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
  primary: 'border border-sky-600 bg-sky-600 text-white hover:bg-sky-700',
};

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-10 px-3 text-xs sm:text-sm',
  md: 'h-11 px-4 text-sm',
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="base-button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
    :class="[VARIANT_CLASSES[variant], SIZE_CLASSES[size]]"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
