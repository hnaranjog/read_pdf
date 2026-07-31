<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  open: boolean;
  fileName: string;
  fileSize?: number;
  lastModified?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const sizeLabel = computed(() =>
  props.fileSize !== undefined ? `${(props.fileSize / 1024).toFixed(2)} KB` : '',
);

const dateLabel = computed(() =>
  props.lastModified !== undefined
    ? new Date(props.lastModified).toLocaleDateString()
    : '',
);
</script>

<template>
  <Teleport to="body">
    <Transition name="rk-popup">
      <div v-if="open" class="rk-popup" role="dialog" aria-modal="true" @click.self="emit('close')">
        <div class="rk-popup-content">
          <button type="button" class="rk-popup-close" aria-label="Cerrar" @click="emit('close')">
            &times;
          </button>
          <div class="rk-card">
            <h2>Información del archivo</h2>
            <p>Nombre: {{ fileName }}</p>
            <p v-if="sizeLabel">Tamaño: {{ sizeLabel }}</p>
            <p v-if="dateLabel">Modificado: {{ dateLabel }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rk-popup {
  position: fixed;
  inset: 0;
  z-index: 1010;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rk-backdrop);
}

.rk-popup-content {
  position: relative;
  width: min(90vw, 500px);
  background: var(--rk-surface);
  border: 1px solid var(--rk-border);
  border-radius: var(--rk-radius-lg);
  padding: 1.5rem;
  box-shadow: 0 4px 20px var(--rk-shadow);
}

.rk-popup-close {
  position: absolute;
  top: 0.5rem;
  right: 0.9rem;
  border: none;
  background: none;
  font-size: 1.75rem;
  color: var(--rk-muted);
  cursor: pointer;
}

.rk-popup-close:hover {
  color: var(--rk-on-surface);
}

.rk-card {
  word-wrap: break-word;
}

.rk-card h2 {
  margin-top: 0;
  color: var(--rk-on-surface);
}

.rk-card p {
  color: var(--rk-muted);
}

.rk-popup-enter-active,
.rk-popup-leave-active {
  transition: opacity 0.25s ease;
}
.rk-popup-enter-from,
.rk-popup-leave-to {
  opacity: 0;
}
</style>
