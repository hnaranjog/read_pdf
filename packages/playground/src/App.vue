<script setup lang="ts">
import { ref } from 'vue';
import {
  AppFooter,
  AppNavbar,
  ColorModeSwitcher,
  FileInfoPopup,
  PaginatorBar,
  PdfReader,
  SideNav,
  useColorMode,
} from '@readpdf/reader-ui-kit';
import type { ColorMode, DisplayMode, FlipState } from '@readpdf/shared-types';

const root = ref<HTMLElement | null>(null);
const colorMode = ref<ColorMode>('normal');
useColorMode(root, colorMode);

const source = ref<File | null>(null);
const currentFile = ref<File | null>(null);
const displayMode = ref<DisplayMode>('double');
const sidenavOpen = ref(false);
const infoOpen = ref(false);
const currentPage = ref(0);
const totalPages = ref(0);
const readerRef = ref<InstanceType<typeof PdfReader> | null>(null);

function onFileSelected(file: File): void {
  currentFile.value = file;
  source.value = file;
  infoOpen.value = true;
}

function onFlip(state: FlipState): void {
  currentPage.value = state.currentPage;
  totalPages.value = state.totalPages;
}

function toggleDisplayMode(): void {
  displayMode.value = displayMode.value === 'double' ? 'single' : 'double';
}
</script>

<template>
  <div ref="root" class="rk-theme playground-layout">
    <AppNavbar @toggle-sidenav="sidenavOpen = true" @file-selected="onFileSelected">
      <template #actions>
        <ColorModeSwitcher v-model="colorMode" />
      </template>
      <template #file-info>
        <button
          v-if="currentFile"
          type="button"
          class="rk-icon-btn"
          :title="currentFile.name"
          @click="infoOpen = true"
        >
          ℹ
        </button>
      </template>
    </AppNavbar>

    <main class="playground-main">
      <div v-if="!source" class="playground-empty">
        <p>Abre un PDF para empezar a leer</p>
      </div>
      <div v-else class="playground-reader-stage">
        <PdfReader
          ref="readerRef"
          :source="source"
          :display-mode="displayMode"
          @flip="onFlip"
        />
        <PaginatorBar
          :current-page="currentPage"
          :total-pages="totalPages"
          @prev="readerRef?.flipPrev()"
          @next="readerRef?.flipNext()"
        />
      </div>
    </main>

    <AppFooter :year="2026" />

    <SideNav :open="sidenavOpen" user-name="John Doe" user-email="johndoe@email.com" @close="sidenavOpen = false">
      <a href="#" @click.prevent="toggleDisplayMode">
        Vista: {{ displayMode === 'double' ? 'Doble página' : 'Página simple' }}
      </a>
      <a href="#" @click.prevent>Marcadores (Fase 7)</a>
      <a href="#" @click.prevent>Miniaturas (Fase 7)</a>
    </SideNav>

    <FileInfoPopup
      :open="infoOpen"
      :file-name="currentFile?.name ?? ''"
      :file-size="currentFile?.size"
      :last-modified="currentFile?.lastModified"
      @close="infoOpen = false"
    />
  </div>
</template>

<style scoped>
.playground-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.playground-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  width: min(100%, 1400px);
  margin: 0 auto;
  padding: 1rem;
  min-height: 0;
}

.playground-reader-stage {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  height: 0;
  display: flex;
  flex-direction: column;
}

.playground-reader-stage :deep(.rk-reader-wrap) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.playground-reader-stage :deep(.rk-reader) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.playground-reader-stage :deep(.rk-book) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.playground-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rk-muted);
  font-size: 1.2rem;
  border: 2px dashed var(--rk-border);
  border-radius: var(--rk-radius);
}
</style>
