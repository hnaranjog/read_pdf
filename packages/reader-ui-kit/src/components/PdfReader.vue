<script setup lang="ts">
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import type { DisplayMode, FlipState, PdfDocumentHandle, PdfSource } from '@readpdf/shared-types';
import { usePdfBook } from '../composables/usePdfBook.js';
import PaginatorBar from './PaginatorBar.vue';
import ProgressBar from './ProgressBar.vue';

const props = withDefaults(
  defineProps<{
    source: PdfSource | null;
    displayMode?: DisplayMode;
    scale?: number;
    startPage?: number;
  }>(),
  { displayMode: 'double', scale: 1, startPage: 0 },
);

const emit = defineEmits<{
  flip: [state: FlipState];
  progress: [rendered: number, total: number];
  loaded: [handle: PdfDocumentHandle];
  error: [error: Error];
}>();

const container = ref<HTMLElement | null>(null);
const rendered = ref(0);
const total = ref(0);

const { displayMode } = toRefs(props);

const book = usePdfBook({
  container,
  displayMode,
  scale: props.scale,
  startPage: props.startPage,
  onFlip: (state) => emit('flip', state),
  onProgress: (r, t) => {
    rendered.value = r;
    total.value = t;
    emit('progress', r, t);
  },
  onLoaded: (handle) => emit('loaded', handle),
  onError: (error) => emit('error', error),
});

const showProgress = computed(() => total.value > 0 && rendered.value < total.value);

onMounted(() => {
  if (props.source) void book.open(props.source);
});

watch(
  () => props.source,
  (source) => { if (source) void book.open(source); },
);

defineExpose({
  flipNext: book.flipNext, flipPrev: book.flipPrev, flipToPage: book.flipToPage,
  getHandle: book.getHandle, currentPage: book.currentPage, numPages: book.numPages,
  loading: book.loading, close: book.close,
});
</script>

<template>
  <div class="rk-reader-wrap">
    <div class="rk-reader">
      <div ref="container" class="rk-book" :data-display-mode="displayMode" aria-label="Visor de libro"/>
      <div v-if="book.loading.value && rendered === 0" class="rk-reader-overlay">
        <div class="rk-spinner" role="status" aria-label="Cargando documento"/>
      </div>
      <PaginatorBar
        :current-page="book.currentPage.value"
        :total-pages="book.numPages.value"
        @prev="book.flipPrev()"
        @next="book.flipNext()"
      />
    </div>
    <ProgressBar v-if="showProgress" :value="rendered" :max="total" class="rk-reader-progress" />
  </div>
</template>

<style scoped>
.rk-reader-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  height: 100%;
}

.rk-reader {
  position: relative;
  flex: 1;
  min-height: 0;
}

.rk-reader-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rk-reader-bg);
  z-index: 20;
}

.rk-reader-progress {
  flex-shrink: 0;
}
</style>

