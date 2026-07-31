<script setup lang="ts">
import { ref, watch } from 'vue';
import { getOutline } from '@readpdf/core-pdf-engine';
import type { PdfDocumentHandle, TocEntry } from '@readpdf/shared-types';
import TocNode from './TocNode.vue';

const props = defineProps<{
  handle: PdfDocumentHandle | null;
}>();

const emit = defineEmits<{
  navigate: [pageNumber: number];
}>();

const entries = ref<TocEntry[]>([]);
const loading = ref(false);

watch(
  () => props.handle,
  async (handle) => {
    entries.value = [];
    if (!handle) return;
    loading.value = true;
    try {
      entries.value = await getOutline(handle);
    } catch {
      entries.value = [];
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="rk-toc">
    <p v-if="loading" class="rk-toc-empty">Cargando índice…</p>
    <p v-else-if="entries.length === 0" class="rk-toc-empty">
      Este documento no tiene tabla de contenidos.
    </p>
    <TocNode v-else :entries="entries" @navigate="(p: number) => emit('navigate', p)" />
  </div>
</template>

<style scoped>
.rk-toc-empty {
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
  opacity: 0.85;
}
</style>
