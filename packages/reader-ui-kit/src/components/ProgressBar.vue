<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    max: number;
  }>(),
  {},
);

const percentage = computed(() =>
  props.max > 0 ? Math.min(100, Math.round((props.value / props.max) * 100)) : 0,
);

/** Verde → amarillo → rojo según avanza el renderizado (alerta de carga pesada) */
const barColor = computed(() => {
  if (percentage.value < 50) return '#4caf50';
  if (percentage.value < 75) return '#ffeb3b';
  return '#f44336';
});
</script>

<template>
  <div class="rk-progress" role="progressbar" :aria-valuenow="percentage" aria-valuemin="0" aria-valuemax="100">
    <div
      class="rk-progress-inner"
      :style="{ width: `${percentage}%`, backgroundColor: barColor }"
      :data-value="`${percentage}%`"
    ></div>
  </div>
</template>

<style scoped>
.rk-progress {
  position: relative;
  width: 100%;
  height: 20px;
  background: color-mix(in srgb, var(--rk-border) 40%, transparent);
  border-radius: var(--rk-radius);
  overflow: hidden;
}

.rk-progress-inner {
  height: 100%;
  border-radius: var(--rk-radius);
  transition:
    width 0.3s ease,
    background-color 0.3s ease;
}

.rk-progress-inner::after {
  content: attr(data-value);
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--rk-on-surface);
  font-size: 0.8rem;
  font-weight: bold;
}
</style>
