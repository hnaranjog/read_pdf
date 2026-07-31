<script setup lang="ts">
import type { ColorMode } from '@readpdf/shared-types';

defineProps<{
  modelValue: ColorMode;
}>();

const emit = defineEmits<{
  'update:modelValue': [mode: ColorMode];
}>();

const modes: { value: ColorMode; label: string; icon: string }[] = [
  { value: 'normal', label: 'Normal', icon: '☀' },
  { value: 'sepia', label: 'Sepia', icon: '📜' },
  { value: 'dark', label: 'Oscuro', icon: '🌙' },
  { value: 'paper', label: 'Papel', icon: '📖' },
];
</script>

<template>
  <div class="rk-color-modes" role="radiogroup" aria-label="Modo de color">
    <button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      class="rk-color-mode-btn"
      :class="{ 'rk-color-mode-btn--active': modelValue === mode.value }"
      :aria-checked="modelValue === mode.value"
      role="radio"
      :title="mode.label"
      @click="emit('update:modelValue', mode.value)"
    >
      <span aria-hidden="true">{{ mode.icon }}</span>
      <span class="rk-color-mode-label">{{ mode.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.rk-color-modes {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: var(--rk-radius);
  background: color-mix(in srgb, var(--rk-border) 30%, transparent);
}

.rk-color-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.4rem 0.7rem;
  border: none;
  border-radius: var(--rk-radius);
  background: transparent;
  color: var(--rk-on-surface);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.rk-color-mode-btn:hover {
  background: color-mix(in srgb, var(--rk-primary) 20%, transparent);
}

.rk-color-mode-btn--active {
  background: var(--rk-primary);
  color: var(--rk-on-primary);
}
</style>
