<script setup lang="ts">
import type { TocEntry } from '@readpdf/shared-types';

defineProps<{
  entries: TocEntry[];
}>();

const emit = defineEmits<{
  navigate: [pageNumber: number];
}>();
</script>

<template>
  <ul class="rk-toc-list">
    <li v-for="(entry, i) in entries" :key="i" class="rk-toc-item">
      <button
        v-if="entry.pageNumber !== null"
        type="button"
        class="rk-toc-link"
        @click="emit('navigate', entry.pageNumber)"
      >
        {{ entry.title }}
      </button>
      <span v-else class="rk-toc-nolink">{{ entry.title }}</span>
      <TocNode
        v-if="entry.children.length > 0"
        :entries="entry.children"
        class="rk-toc-children"
        @navigate="(p: number) => emit('navigate', p)"
      />
    </li>
  </ul>
</template>

<style scoped>
.rk-toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rk-toc-children {
  padding-left: 1rem;
}

.rk-toc-link {
  display: block;
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: none;
  background: none;
  color: var(--rk-on-primary);
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  border-radius: var(--rk-radius);
}

.rk-toc-link:hover {
  background: rgba(255, 255, 255, 0.15);
}

.rk-toc-nolink {
  display: block;
  padding: 0.35rem 0.5rem;
  font-size: 0.95rem;
  font-weight: bold;
  opacity: 0.85;
}
</style>
