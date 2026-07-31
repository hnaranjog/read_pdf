<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';import {
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
import { loadPdfFile, pdfStoreAvailable, savePdfFile } from './pdf-store.js';

const root = ref<HTMLElement | null>(null);
const colorMode = ref<ColorMode>(DEFAULT_SETTINGS.colorMode);
useColorMode(root, colorMode);

const user = ref<User | null>(null);
const source = ref<Uint8Array | null>(null);
const displayMode = ref<DisplayMode>(DEFAULT_SETTINGS.displayMode);
const startPage = ref(0);
const sidenavOpen = ref(false);
const infoOpen = ref(false);
const currentPage = ref(0);
const totalPages = ref(0);
const currentFileName = ref('');
const currentFileSize = ref<number | undefined>(undefined);
const library = ref<DocumentMeta[]>([]);
const recentDocuments = computed<DocumentMeta[]>(() => {
  const seen = new Set<string>();
  const unique: DocumentMeta[] = [];
  for (const doc of library.value) {
    // clave por nombre+ tamaño para evitar duplicados de un mismo archivo reabierto
    const key = `${doc.fileName}|${doc.fileSize}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(doc);
  }
  return unique.slice(0, 3);
});
const readerRef = ref<InstanceType<typeof PdfReader> | null>(null);
const pdfHandle = ref<PdfDocumentHandle | null>(null);
const bookmarks = ref<Bookmark[]>([]);
const thumbsOpen = ref(false);

let db: Database | null = null;
let currentDoc: DocumentMeta | null = null;
let pendingBytes: Uint8Array | null = null;
let positionSaveTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  db = await Database.create(); // web → sql.js + OPFS (fallback IndexedDB)
  user.value =
    (await db.users.getByEmail('guest@readpdf.local')) ??
    (await db.users.create({ name: 'Invitado', email: 'guest@readpdf.local' }));

  const saved = await db.settings.get<ColorMode>('colorMode');
  if (saved) colorMode.value = saved;

  await refreshLibrary();
});

async function refreshLibrary(): Promise<void> {
  if (db && user.value) library.value = await db.documents.listByUser(user.value.id);
}

/** Apertura de un archivo nuevo vía input del navbar. */
async function onFileSelected(file: File): Promise<void> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    currentDoc = null;
    pendingBytes = bytes;
    bookmarks.value = [];
    currentFileName.value = file.name;
    currentFileSize.value = file.size;
    startPage.value = 0;
    infoOpen.value = true;
    source.value = bytes;
  } catch (err) {
    console.error('Error al leer el archivo:', err);
    alert(`No se pudo leer el archivo: ${(err as Error).message}`);
  }
}

function onReaderError(error: Error): void {
  console.error('Error en el lector:', error);
  alert(`No se pudo visualizar el PDF: ${error.message}`);
  source.value = null;
}

async function refreshBookmarks(): Promise<void> {
  bookmarks.value = db && currentDoc ? await db.bookmarks.listByDocument(currentDoc.id) : [];
}

/** Apertura desde la biblioteca (documento ya persistido en OPFS). */
async function openFromLibrary(doc: DocumentMeta): Promise<void> {
  const bytes = await loadPdfFile(doc.filePath);
  if (!bytes) {
    alert('No se encontró el archivo en el almacenamiento local.');
    return;
  }
  sidenavOpen.value = false;
  currentDoc = doc;
  pendingBytes = bytes;
  currentFileName.value = doc.fileName;
  currentFileSize.value = doc.fileSize;
  startPage.value = Math.max(0, doc.lastOpenedPage - 1);
  source.value = bytes;
  await refreshBookmarks();
}

async function onFlip(state: FlipState): Promise<void> {
  currentPage.value = state.currentPage;
  totalPages.value = state.totalPages;

  // Registrar el documento la primera vez que conocemos su número de páginas
  if (db && user.value && !currentDoc && pendingBytes && state.totalPages > 0) {
    // Evitar duplicados: si ya existe un documento para el mismo archivo (nombre+tamaño), reutilizarlo
    const existing = library.value.find(
      (d) => d.fileName === currentFileName.value && d.fileSize === (currentFileSize.value ?? 0),
    );
    if (existing) {
      currentDoc = existing;
      const key = `pdfs/${existing.id}.pdf`;
      await savePdfFile(key, pendingBytes);
      await db.documents.updateMeta(existing.id, {
        filePath: key,
        numPages: state.totalPages,
      });
      currentDoc = { ...existing, filePath: key, numPages: state.totalPages };
      await refreshLibrary();
      await refreshBookmarks();
    } else {
      const doc = await db.documents.create({
        userId: user.value.id,
        title: currentFileName.value.replace(/\.pdf$/i, ''),
        fileName: currentFileName.value,
        fileSize: currentFileSize.value ?? 0,
        filePath: '',
        numPages: state.totalPages,
        lastOpenedPage: 1,
      });
      const key = `pdfs/${doc.id}.pdf`;
      await savePdfFile(key, pendingBytes);
      await db.documents.updateMeta(doc.id, { filePath: key });
      currentDoc = { ...doc, filePath: key };
      await refreshLibrary();
      await refreshBookmarks();
    }
    pendingBytes = null;
  }

  if (positionSaveTimer) clearTimeout(positionSaveTimer);
  positionSaveTimer = setTimeout(() => void persistPosition(), 600);
}

async function persistPosition(): Promise<void> {
  if (!db || !currentDoc) return;
  await db.documents.updateReadingPosition(currentDoc.id, currentPage.value + 1);
}

function toggleDisplayMode(): void {
  displayMode.value = displayMode.value === 'double' ? 'single' : 'double';
}

async function onColorModeChange(mode: ColorMode): Promise<void> {
  colorMode.value = mode;
  await db?.settings.set('colorMode', mode);
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
</script>

<template>
  <div ref="root" class="rk-theme web-layout">
    <AppNavbar @toggle-sidenav="sidenavOpen = true" @file-selected="onFileSelected">
      <template #actions>
        <ColorModeSwitcher :model-value="colorMode" @update:model-value="onColorModeChange" />
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

    <main class="web-main">
      <div v-if="!source" class="web-empty">
        <p>Abre un PDF para empezar a leer</p>
        <p v-if="recentDocuments.length > 0" class="web-empty-hint">
          o retoma uno de tu biblioteca en el menú lateral
        </p>
      </div>
      <div v-else class="web-reader-stage">
        <PdfReader
          ref="readerRef"
          :key="`${currentFileName}:${startPage}`"
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
        <details class="web-section">
          <summary>Tabla de contenidos</summary>
          <TocPanel :handle="pdfHandle" @navigate="goToPage" />
        </details>
        <details class="web-section">
          <summary>Miniaturas</summary>
          <button type="button" class="rk-btn web-section-btn" @click="thumbsOpen = true">
            Ver cuadrícula de páginas
          </button>
        </details>
        <details class="web-section">
          <summary>Marcadores</summary>
          <BookmarkPanel
            :bookmarks="bookmarks"
            :current-page="currentPage"
            @add="addBookmark"
            @remove="removeBookmark"
            @navigate="goToPage"
          />
        </details>
        <details class="web-section">
          <summary>Lectura en voz alta</summary>
          <TtsControls :text-provider="currentPageText" />
        </details>
      </template>

      <hr v-if="recentDocuments.length > 0" />
      <button
        v-for="doc in recentDocuments"
        :key="doc.id"
        type="button"
        :title="`${doc.fileName} — página ${doc.lastOpenedPage} de ${doc.numPages}`"
        @click="openFromLibrary(doc)"
      >
        📕 {{ doc.title }}
      </button>
      <p v-if="!pdfStoreAvailable()" class="web-opfs-warning">
        Este navegador no soporta OPFS: la biblioteca no persistirá archivos.
      </p>
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
.web-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
}

.web-main {
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

.web-reader-stage {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  height: 0;
  display: flex;
  flex-direction: column;
}

.web-reader-stage :deep(.rk-reader-wrap) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.web-reader-stage :deep(.rk-reader) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.web-reader-stage :deep(.rk-book) {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
}

.web-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--rk-muted);
  font-size: 1.2rem;
  border: 2px dashed var(--rk-border);
  border-radius: var(--rk-radius);
}

.web-empty-hint {
  font-size: 0.95rem;
}

.web-opfs-warning {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  opacity: 0.9;
}

.web-section summary {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: var(--rk-radius);
}

.web-section summary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.web-section[open] summary {
  margin-bottom: 0.25rem;
}

.web-section-btn {
  margin: 0.25rem 0.5rem;
  font-size: 0.9rem;
}
</style>
