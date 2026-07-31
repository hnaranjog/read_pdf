<script setup lang="ts">
import { useTts } from '../composables/useTts.js';

const props = defineProps<{
  /** Devuelve el texto a leer en voz alta (p. ej. la página actual) */
  textProvider: () => Promise<string>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  error: [message: string];
}>();

const tts = useTts();

async function play(): Promise<void> {
  try {
    const text = await props.textProvider();
    if (!text.trim()) {
      emit('error', 'No hay texto legible en esta página.');
      return;
    }
    tts.speak(text);
  } catch (err) {
    emit('error', (err as Error).message);
  }
}
</script>

<template>
  <div v-if="tts.supported" class="rk-tts">
    <div class="rk-tts-buttons">
      <button
        v-if="!tts.speaking.value"
        type="button"
        class="rk-btn"
        :disabled="disabled"
        @click="play"
      >
        ▶ Leer página
      </button>
      <template v-else>
        <button v-if="!tts.paused.value" type="button" class="rk-btn" @click="tts.pause">
          ⏸ Pausar
        </button>
        <button v-else type="button" class="rk-btn" @click="tts.resume">⏵ Seguir</button>
        <button type="button" class="rk-btn rk-btn--ghost" @click="tts.stop">⏹ Parar</button>
      </template>
    </div>
    <label class="rk-tts-rate">
      Velocidad: {{ tts.rate.value.toFixed(1) }}x
      <input v-model.number="tts.rate.value" type="range" min="0.5" max="2" step="0.1" />
    </label>
  </div>
  <p v-else class="rk-tts-unsupported">Este navegador no soporta síntesis de voz.</p>
</template>

<style scoped>
.rk-tts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
}

.rk-tts-buttons {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.rk-tts-rate {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--rk-on-primary);
}

.rk-tts-rate input {
  accent-color: var(--rk-on-primary);
}

.rk-tts-unsupported {
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
  opacity: 0.85;
}
</style>
