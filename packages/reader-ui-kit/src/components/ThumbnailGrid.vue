<script setup lang="ts">
import { ref, watch } from 'vue';
import { renderThumbnail } from '@readpdf/core-pdf-engine';
import type { PdfDocumentHandle } from '@readpdf/shared-types';

const props = defineProps<{
  handle: PdfDocumentHandle | null;
  open: boolean;
}>();

const emit = defineEmits<{
  navigate: [pageIndex: number];
  close: [];
}>();

interface Thumb {
  pageNumber: number;
  url: string;
}

const thumbs = ref<Thumb[]>([]);
const rendering = ref(false);

watch(
  () => props.open,
  async (open) => {
    if (!open || !props.handle) return;
    rendering.value = true;
    thumbs.value = [];
    const total = props.handle.numPages;
    for (let n = 1; n <= total; n++) {
      if (!props.open) return; // cerrado mientras renderiza
      const canvas = await renderThumbnail(props.handle, n, 140);
      thumbs.value.push({ pageNumber: n, url: canvas.toDataURL() });
      if (n % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    rendering.value = false;
  },
);

function go(pageNumber: number): void {
  emit('navigate', pageNumber - 1); // a índice 0-based
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="rk-thumbs">
      <div v-if="open" class="rk-thumbs-backdrop" @click.self="emit('close')">
        <div class="rk-thumbs-panel" role="dialog" aria-label="Miniaturas de páginas">
          <div class="rk-thumbs-header">
            <h2>Páginas</h2>
            <button type="button" class="rk-thumbs-close" aria-label="Cerrar" @click="emit('close')">
              &times;
            </button>
          </div>
          <div class="rk-thumbs-grid">
            <button
              v-for="thumb in thumbs"
              :key="thumb.pageNumber"
              type="button"
              class="rk-thumb"
              :title="`Ir a página ${thumb.pageNumber}`"
              @click="go(thumb.pageNumber)"
            >
              <img :src="thumb.url" :alt="`Página ${thumb.pageNumber}`" loading="lazy" />
              <span>{{ thumb.pageNumber }}</span>
            </button>
            <p v-if="rendering" class="rk-thumbs-loading">Generando miniaturas…</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rk-thumbs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1010;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rk-backdrop);
}

.rk-thumbs-panel {
  width: min(92vw, 900px);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--rk-surface);
  border-radius: var(--rk-radius-lg);
  box-shadow: 0 4px 24px var(--rk-shadow);
  overflow: hidden;
}

.rk-thumbs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--rk-border);
}

.rk-thumbs-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--rk-on-surface);
}

.rk-thumbs-close {
  border: none;
  background: none;
  font-size: 1.75rem;
  color: var(--rk-muted);
  cursor: pointer;
}

.rk-thumbs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  overflow-y: auto;
}

.rk-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem;
  border: 1px solid var(--rk-border);
  border-radius: var(--rk-radius);
  background: var(--rk-bg);
  color: var(--rk-on-surface);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.rk-thumb:hover {
  border-color: var(--rk-primary);
  box-shadow: 0 2px 8px var(--rk-shadow);
}

.rk-thumb img {
  max-width: 100%;
  height: auto;
  filter: var(--rk-page-filter);
}

.rk-thumbs-loading {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--rk-muted);
}

.rk-thumbs-enter-active,
.rk-thumbs-leave-active {
  transition: opacity 0.25s ease;
}
.rk-thumbs-enter-from,
.rk-thumbs-leave-to {
  opacity: 0;
}
</style>
