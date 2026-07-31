<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  /** Índice 0-based de la página actual */
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  prev: [];
  next: [];
}>();

const label = computed(() => {
  if (props.totalPages === 0) return 'Sin documento';
  return `Página ${props.currentPage + 1} de ${props.totalPages}`;
});
</script>

<template>
  <div class="rk-side-nav">
    <button
      type="button"
      class="rk-side-nav-btn"
      :disabled="totalPages === 0"
      aria-label="Página anterior"
      @click="emit('prev')"
    >
      &lsaquo;
    </button>
    <span class="rk-side-nav-label">{{ label }}</span>
    <button
      type="button"
      class="rk-side-nav-btn"
      :disabled="totalPages === 0"
      aria-label="Página siguiente"
      @click="emit('next')"
    >
      &rsaquo;
    </button>
  </div>
</template>

<style scoped>
.rk-side-nav {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;
  z-index: 10;
}

.rk-side-nav-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 3.5rem;
  border: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--rk-primary) 75%, transparent);
  color: var(--rk-on-primary);
  font-size: 2.5rem;
  line-height: 1;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  backdrop-filter: blur(2px);
}

.rk-side-nav-btn:hover:not(:disabled) {
  background: var(--rk-primary);
  transform: scale(1.08);
}

.rk-side-nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.rk-side-nav-label {
  pointer-events: none;
  align-self: flex-end;
  margin-bottom: 0.5rem;
  padding: 0.15rem 0.6rem;
  border-radius: var(--rk-radius);
  background: color-mix(in srgb, var(--rk-surface, #fff) 80%, transparent);
  color: var(--rk-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}
</style>
