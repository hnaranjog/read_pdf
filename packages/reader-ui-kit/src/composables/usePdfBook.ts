import { nextTick, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import { destroy, getPageDimensions, loadPdf, renderPage } from '@readpdf/core-pdf-engine';
import { createFlipView, type FlipView } from '@readpdf/flip-view-engine';
import type {
  DisplayMode,
  FlipState,
  PdfDocumentHandle,
  PdfSource,
} from '@readpdf/shared-types';

export interface UsePdfBookOptions {
  /** Contenedor donde se monta el libro */
  container: Ref<HTMLElement | null>;
  /** Modo de vista reactivo — el libro cambia solo/double al vuelo */
  displayMode: Ref<DisplayMode>;
  /** Escala de renderizado */
  scale?: number;
  /** Página inicial 0-based al abrir un documento (reanudar lectura) */
  startPage?: number;
  onFlip?: (state: FlipState) => void;
  onProgress?: (rendered: number, total: number) => void;
  onLoaded?: (handle: PdfDocumentHandle) => void;
  onError?: (error: Error) => void;
}

export interface PdfBookState {
  loading: Ref<boolean>;
  numPages: Ref<number>;
  currentPage: Ref<number>;
  open: (source: PdfSource) => Promise<void>;
  close: () => Promise<void>;
  flipNext: () => void;
  flipPrev: () => void;
  flipToPage: (pageIndex: number) => void;
  getHandle: () => PdfDocumentHandle | null;
}

/**
 * Orquesta core-pdf-engine + flip-view-engine:
 * carga el PDF, renderiza páginas progresivamente (con placeholders
 * para que el flip funcione desde la primera página) y monta el visor.
 */
export function usePdfBook(options: UsePdfBookOptions): PdfBookState {
  const loading = ref(false);
  const numPages = ref(0);
  const currentPage = ref(0);

  let handle: PdfDocumentHandle | null = null;
  let view: FlipView | null = null;
  let loadToken = 0;
  const renderedPages = shallowRef<HTMLElement[]>([]);

  function readVisibleSize(el: HTMLElement): { width: number; height: number } | null {
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }

      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    return null;
  }

  /**
   * Espera a que el contenedor o uno de sus ancestros tenga un tamaño real.
   * Esto cubre el primer render del layout y también cambios posteriores de flex.
   */
  function waitForSize(el: HTMLElement): Promise<{ width: number; height: number }> {
    const currentSize = readVisibleSize(el);
    if (currentSize) return Promise.resolve(currentSize);

    return new Promise((resolve) => {
      let settled = false;
      let frameId = 0;
      const observer = new ResizeObserver(() => {
        const size = readVisibleSize(el);
        if (size) finish(size.width, size.height);
      });
      const timeoutId = window.setTimeout(() => {
        const size = readVisibleSize(el);
        finish(size?.width ?? 0, size?.height ?? 0);
      }, 10000);

      const finish = (width: number, height: number) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        cancelAnimationFrame(frameId);
        clearTimeout(timeoutId);
        resolve({ width, height });
      };

      const check = () => {
        const size = readVisibleSize(el);
        if (size) {
          finish(size.width, size.height);
          return;
        }
        frameId = requestAnimationFrame(check);
      };

      frameId = requestAnimationFrame(check);
      observer.observe(el);
      if (el.parentElement) observer.observe(el.parentElement);
    });
  }

  function wrapPlaceholder(width: number, height: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'rk-page';
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    return div;
  }

  async function open(source: PdfSource): Promise<void> {
    await close();
    // El token se captura DESPUÉS de close() — close() incrementa loadToken
    // para invalidar cargas previas; capturarlo antes abortaría esta apertura.
    const token = ++loadToken;
    loading.value = true;

    try {
      handle = await loadPdf(source);
      if (token !== loadToken) return;
      numPages.value = handle.numPages;

      const container = options.container.value;
      if (!container) throw new Error('Contenedor del libro no disponible');

      // 1. Dimensiones base de la página a escala 1 (sin render)
      const baseDims = await getPageDimensions(handle, 1);
      if (token !== loadToken) return;

      // 2. Escala óptima para que la página encaje en el contenedor
      // Esperar a que el layout haya medido el contenedor (puede ser 0
      // si open() se invoca antes del primer reflow, p. ej. al cambiar
      // props.source defendant desde un event handler).
      await nextTick();
      const containerSize = await waitForSize(container);
      if (token !== loadToken) return;
      if (containerSize.width <= 0 || containerSize.height <= 0) {
        throw new Error('Contenedor del libro sin dimensiones');
      }
      const pagesPerSpread = options.displayMode.value === 'single' ? 1 : 2;
      const fitScaleW = (containerSize.width / pagesPerSpread) / baseDims.width;
      const fitScaleH = containerSize.height / baseDims.height;
      const fitScale = Math.min(fitScaleW, fitScaleH);
      const zoom = options.scale ?? 1;
      const renderScale = fitScale * zoom;

      // 3. Dimensiones CSS de cada página (lo que medirá el flip)
      const pageWidth = Math.floor(baseDims.width * renderScale);
      const pageHeight = Math.floor(baseDims.height * renderScale);

      // 4. Render de la primera página
      const firstCanvas = await renderPage(handle, 1, { scale: renderScale });
      if (token !== loadToken) return;

      // 5. Placeholders del mismo tamaño que el canvas renderizado
      const pages: HTMLElement[] = [];
      const firstPage = wrapPlaceholder(pageWidth, pageHeight);
      firstPage.appendChild(firstCanvas);
      pages.push(firstPage);
      for (let n = 2; n <= handle.numPages; n++) pages.push(wrapPlaceholder(pageWidth, pageHeight));

      renderedPages.value = pages;
      options.onProgress?.(1, handle.numPages);

      // 6. Crear flip view con dimensiones exactas (coinciden con canvas CSS)
      view = createFlipView(container, {
        width: pageWidth,
        height: pageHeight,
        displayMode: options.displayMode.value,
      });
      view.setPages(pages, options.startPage ?? 0);
      view.on('flip', (state) => {
        currentPage.value = state.currentPage;
        options.onFlip?.(state);
      });
      currentPage.value = options.startPage ?? 0;
      loading.value = false;
      options.onLoaded?.(handle);

      // 7. Render progresivo del resto sin bloquear la interacción
      for (let n = 2; n <= handle.numPages; n++) {
        if (token !== loadToken) return;
        const canvas = await renderPage(handle, n, { scale: renderScale });
        if (token !== loadToken) return;
        const placeholder = pages[n - 1];
        placeholder.replaceChildren(canvas);
        options.onProgress?.(n, handle.numPages);
        // ceder el hilo para mantener la UI fluida
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch (err) {
      loading.value = false;
      options.onError?.(err as Error);
    }
  }

  async function close(): Promise<void> {
    loadToken++;
    view?.destroy();
    view = null;
    if (handle) {
      await destroy(handle);
      handle = null;
    }
    numPages.value = 0;
    currentPage.value = 0;
    renderedPages.value = [];
    loading.value = false;
  }

  function flipNext(): void {
    view?.flipNext();
  }

  function flipPrev(): void {
    view?.flipPrev();
  }

  function flipToPage(pageIndex: number): void {
    view?.flipToPage(pageIndex);
  }

  function getHandle(): PdfDocumentHandle | null {
    return handle;
  }

  // Cambio de modo simple/doble al vuelo
  const stopWatchDisplayMode = watch(options.displayMode, (mode) => {
    view?.setDisplayMode(mode);
  });

  onBeforeUnmount(() => {
    stopWatchDisplayMode();
    void close();
  });

  return {
    loading,
    numPages,
    currentPage,
    open,
    close,
    flipNext,
    flipPrev,
    flipToPage,
    getHandle,
  };
}
