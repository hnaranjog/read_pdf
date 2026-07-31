<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import {
  AppFooter,
  AppNavbar,
  BookmarkPanel,
  ColorModeSwitcher,
  FileInfoPopup,
  PaginatorBar,
  PdfReader,
  SideNav,
  ThumbnailGrid,
  TocPanel,
  TtsControls,
  useColorMode,
} from '@readpdf/reader-ui-kit';
import { Database } from '@readpdf/storage-layer';
import { getTextContent } from '@readpdf/core-pdf-engine';
import type {
  Bookmark,
  ColorMode,
  DisplayMode,
  DocumentMeta,
  FlipState,
  PdfDocumentHandle,
  User,
} from '@readpdf/shared-types';
import { DEFAULT_SETTINGS } from '@readpdf/shared-types';

const root = ref<HTMLElement | null>(null);
const colorMode = ref<ColorMode>(DEFAULT_SETTINGS.colorMode);
useColorMode(root, colorMode);

const source = ref<Uint8Array | null>(null);
const displayMode = ref<DisplayMode>(DEFAULT_SETTINGS.displayMode);
const startPage = ref(0);
const sidenavOpen = ref(false);
const infoOpen = ref(false);
const currentPage = ref(0);
const totalPages = ref(0);
const currentFileName = ref('');
const currentFileSize = ref<number | undefined>(undefined);
const readerRef = ref<InstanceType<typeof PdfReader> | null>(null);
const pdfHandle = ref<PdfDocumentHandle | null>(null);
const bookmarks = ref<Bookmark[]>([]);
const thumbsOpen = ref(false);

const user = ref<User | null>(null);
let db: Database | null = null;
let currentDoc: DocumentMeta | null = null;
let currentPath: string | null = null;
let positionSaveTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  db = await Database.create(); // detecta Tauri → SQLite nativo
  user.value =
    (await db.users.getByEmail('guest@readpdf.local')) ??
    (await db.users.create({ name: 'Invitado', email: 'guest@readpdf.local' }));

  const saved = await db.settings.get<ColorMode>('colorMode');
  if (saved) colorMode.value = saved;
});

/** Abre un PDF con el diálogo nativo del SO y reanuda la última posición leída. */
async function openNativePdf(): Promise<void> {
  try {
    const path = await open({
      multiple: false,
      filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
    });
    if (!path || typeof path !== 'string' || !db || !user.value) return;

    const bytes = await readFile(path);
    currentPath = path;
    currentFileName.value = path.split(/[\\/]/).pop() ?? 'documento.pdf';
    currentFileSize.value = bytes.byteLength;

    // Reanudar lectura si el documento ya se abrió antes
    currentDoc = await db.documents.findByPath(user.value.id, path);
    startPage.value = currentDoc ? Math.max(0, currentDoc.lastOpenedPage - 1) : 0;
    source.value = bytes;
    await refreshBookmarks();
  } catch (err) {
    console.error('Error al abrir el PDF:', err);
    alert(`No se pudo abrir el archivo: ${(err as Error).message}`);
  }
}

function onReaderError(error: Error): void {
  console.error('Error en el lector:', error);
  alert(`No se pudo visualizar el PDF: ${error.message}`);
  source.value = null;
}

async function onFlip(state: FlipState): Promise<void> {
  currentPage.value = state.currentPage;
  totalPages.value = state.totalPages;

  // Registrar el documento la primera vez que conocemos su número de páginas
  if (db && user && currentPath && !currentDoc && state.totalPages > 0) {
    currentDoc = await db.documents.create({
      userId: user.value!.id,
      title: currentFileName.value.replace(/\.pdf$/i, ''),
      fileName: currentFileName.value,
      fileSize: currentFileSize.value ?? 0,
      filePath: currentPath,
      numPages: state.totalPages,
      lastOpenedPage: 1,
    });
    await refreshBookmarks();
  }

  // Persistir posición de lectura (debounced)
  if (positionSaveTimer) clearTimeout(positionSaveTimer);
  positionSaveTimer = setTimeout(() => void persistPosition(), 600);
}

async function persistPosition(): Promise<void> {
  if (!db || !currentDoc) return;
  await db.documents.updateReadingPosition(currentDoc.id, currentPage.value + 1);
}

async function refreshBookmarks(): Promise<void> {
  bookmarks.value = db && currentDoc ? await db.bookmarks.listByDocument(currentDoc.id) : [];
}

// --- Navegación por paneles ---

function goToPage(pageNumber: number): void {
  readerRef.value?.flipToPage(pageNumber - 1); // a índice 0-based
}

// --- Marcadores ---

async function addBookmark(note: string): Promise<void> {
  if (!db || !currentDoc) {
    alert('El documento aún se está registrando. Inténtalo en un momento.');
    return;
  }
  await db.bookmarks.add({
    documentId: currentDoc.id,
    pageNumber: currentPage.value + 1,
    note,
  });
  await refreshBookmarks();
}

async function removeBookmark(id: number): Promise<void> {
  if (!db) return;
  await db.bookmarks.remove(id);
  await refreshBookmarks();
}

// --- TTS ---

async function currentPageText(): Promise<string> {
  if (!pdfHandle.value) return '';
  const content = await getTextContent(pdfHandle.value, currentPage.value + 1);
  return content.text;
}

function toggleDisplayMode(): void {
  displayMode.value = displayMode.value === 'double' ? 'single' : 'double';
}

async function onColorModeChange(mode: ColorMode): Promise<void> {
  colorMode.value = mode;
  await db?.settings.set('colorMode', mode);
}
</script>

<template>
  <div ref="root" class="rk-theme desktop-layout">
    <AppNavbar @toggle-sidenav="sidenavOpen = true">
      <template #actions>
        <ColorModeSwitcher :model-value="colorMode" @update:model-value="onColorModeChange" />
      </template>
      <template #upload>
        <button type="button" class="rk-btn" @click="openNativePdf">Abrir PDF</button>
      </template>
      <template #file-info>
        <button
          v-if="source"
          type="button"
          class="rk-icon-btn"
          :title="currentFileName"
          @click="infoOpen = true"
        >
          ℹ
        </button>
      </template>
    </AppNavbar>

    <main class="desktop-main">
      <div v-if="!source" class="desktop-empty">
        <p>Abre un PDF para empezar a leer</p>
      </div>
      <div v-else class="desktop-reader-stage">
        <PdfReader
          ref="readerRef"
          :key="startPage"
          :source="source"
          :display-mode="displayMode"
          :start-page="startPage"
          @flip="onFlip"
          @loaded="(h: PdfDocumentHandle) => (pdfHandle = h)"
          @error="onReaderError"
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

    <SideNav
      :open="sidenavOpen"
      :user-name="user?.name"
      :user-email="user?.email"
      @close="sidenavOpen = false"
    >
      <a href="#" @click.prevent="toggleDisplayMode">
        Vista: {{ displayMode === 'double' ? 'Doble página' : 'Página simple' }}
      </a>

      <template v-if="source">
        <hr />
        <details class="desktop-section">
          <summary>Tabla de contenidos</summary>
          <TocPanel :handle="pdfHandle" @navigate="goToPage" />
        </details>
        <details class="desktop-section">
          <summary>Miniaturas</summary>
          <button type="button" class="rk-btn desktop-section-btn" @click="thumbsOpen = true">
            Ver cuadrícula de páginas
          </button>
        </details>
        <details class="desktop-section">
          <summary>Marcadores</summary>
          <BookmarkPanel
            :bookmarks="bookmarks"
            :current-page="currentPage"
            @add="addBookmark"
            @remove="removeBookmark"
            @navigate="goToPage"
          />
        </details>
        <details class="desktop-section">
          <summary>Lectura en voz alta</summary>
          <TtsControls :text-provider="currentPageText" />
        </details>
      </template>
    </SideNav>

    <ThumbnailGrid
      :handle="pdfHandle"
      :open="thumbsOpen"
      @navigate="(i: number) => readerRef?.flipToPage(i)"
      @close="thumbsOpen = false"
    />

    <FileInfoPopup
      :open="infoOpen"
      :file-name="currentFileName"
      :file-size="currentFileSize"
      @close="infoOpen = false"
    />
  </div>
</template>

<style scoped>
.desktop-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.desktop-main {
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

.desktop-reader-stage {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  height: 0;
  display: flex;
  flex-direction: column;
}

.desktop-reader-stage :deep(.rk-reader-wrap) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.desktop-reader-stage :deep(.rk-reader) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.desktop-reader-stage :deep(.rk-book) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.desktop-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rk-muted);
  font-size: 1.2rem;
  border: 2px dashed var(--rk-border);
  border-radius: var(--rk-radius);
}

.desktop-section summary {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: var(--rk-radius);
}

.desktop-section summary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.desktop-section[open] summary {
  margin-bottom: 0.25rem;
}

.desktop-section-btn {
  margin: 0.25rem 0.5rem;
  font-size: 0.9rem;
}
</style>
