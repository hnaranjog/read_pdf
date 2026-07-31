<script setup lang="ts">
import { ref } from 'vue';
import type { Bookmark } from '@readpdf/shared-types';

defineProps<{
  bookmarks: Bookmark[];
  /** Índice 0-based de la página actual */
  currentPage: number;
}>();

const emit = defineEmits<{
  add: [note: string];
  remove: [id: number];
  navigate: [pageNumber: number];
}>();

const note = ref('');

function submit(): void {
  emit('add', note.value.trim());
  note.value = '';
}
</script>

<template>
  <div class="rk-bookmarks">
    <form class="rk-bookmark-form" @submit.prevent="submit">
      <input
        v-model="note"
        type="text"
        :placeholder="`Nota para página ${currentPage + 1} (opcional)`"
        maxlength="200"
      />
      <button type="submit" class="rk-btn">+ Marcar pág. {{ currentPage + 1 }}</button>
    </form>

    <p v-if="bookmarks.length === 0" class="rk-bookmarks-empty">Sin marcadores todavía.</p>
    <ul v-else class="rk-bookmarks-list">
      <li v-for="bm in bookmarks" :key="bm.id" class="rk-bookmark-item">
        <button type="button" class="rk-bookmark-go" @click="emit('navigate', bm.pageNumber)">
          <strong>Pág. {{ bm.pageNumber }}</strong>
          <span v-if="bm.note"> — {{ bm.note }}</span>
        </button>
        <button
          type="button"
          class="rk-bookmark-del"
          :aria-label="`Eliminar marcador de página ${bm.pageNumber}`"
          @click="emit('remove', bm.id)"
        >
          &times;
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.rk-bookmark-form {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.rk-bookmark-form input {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--rk-border);
  border-radius: var(--rk-radius);
  font-size: 0.9rem;
}

.rk-bookmarks-empty {
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
  opacity: 0.85;
}

.rk-bookmarks-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rk-bookmark-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.rk-bookmark-go {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: none;
  background: none;
  color: var(--rk-on-primary);
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  border-radius: var(--rk-radius);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rk-bookmark-go:hover {
  background: rgba(255, 255, 255, 0.15);
}

.rk-bookmark-del {
  border: none;
  background: none;
  color: var(--rk-on-primary);
  font-size: 1.1rem;
  cursor: pointer;
  opacity: 0.7;
}

.rk-bookmark-del:hover {
  opacity: 1;
}
</style>
