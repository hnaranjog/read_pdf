/// <reference path="./page-flip.d.ts" />
import { PageFlip } from 'page-flip';
import type {
  DisplayMode,
  FlipOrientation,
  FlipState,
  FlipViewState,
} from '@readpdf/shared-types';
import { Emitter } from './emitter.js';

export interface FlipViewOptions {
  /** Ancho de UNA página en px CSS (0 = calcular desde el contenedor) */
  width?: number;
  /** Alto de página en px CSS (0 = calcular desde el contenedor) */
  height?: number;
  /** 'double' = landscape (2 páginas), 'single' = portrait */
  displayMode?: DisplayMode;
  /** Tratar la primera página como portada simple */
  showCover?: boolean;
  /** Duración de la animación de flip en ms */
  flippingTime?: number;
  /** Recalcular layout automáticamente al cambiar el tamaño del contenedor */
  autoResize?: boolean;
}

interface FlipViewEvents {
  flip: FlipState;
  stateChange: FlipViewState;
  orientationChange: FlipOrientation;
  [key: string]: unknown;
}

const RESIZE_DEBOUNCE_MS = 150;

/**
 * Visor de hojas de libro. Agnóstico al contenido: recibe elementos
 * ya renderizados (canvas, imágenes, divs) y solo gestiona la física
 * del paso de página, gestos táctiles/mouse y el layout single/double.
 */
export class FlipView {
  private readonly emitter = new Emitter<FlipViewEvents>();
  private readonly container: HTMLElement;
  private readonly options: Required<Omit<FlipViewOptions, 'autoResize'>> & { autoResize: boolean };
  private pageFlip: PageFlip | null = null;
  private pages: HTMLElement[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private startPage = 0;

  constructor(container: HTMLElement, options: FlipViewOptions) {
    this.container = container;
    this.options = {
      displayMode: options.displayMode ?? 'double',
      showCover: options.showCover ?? false,
      flippingTime: options.flippingTime ?? 800,
      autoResize: options.autoResize ?? true,
      width: options.width ?? 0,
      height: options.height ?? 0,
    };
  }

  /** Crea (o recrea) la instancia interna de PageFlip. */
  private mount(): void {
    const dual = this.options.displayMode !== 'single';
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const pageWidth =
      this.options.width > 0
        ? this.options.width
        : dual
          ? Math.floor(containerWidth / 2)
          : Math.max(containerWidth, 1);
    const pageHeight =
      this.options.height > 0 ? this.options.height : Math.max(containerHeight, 1);

    this.pageFlip?.destroy();
    this.pageFlip = new PageFlip(this.container, {
      width: pageWidth,
      height: pageHeight,
      size: 'stretch',
      minWidth: pageWidth,
      minHeight: pageHeight,
      maxWidth: pageWidth,
      maxHeight: pageHeight,
      autoSize: false,
      usePortrait: !dual,
      showCover: this.options.showCover,
      flippingTime: this.options.flippingTime,
      maxShadowOpacity: 0.4,
      drawShadow: true,
      mobileScrollSupport: false,
      swipeDistance: 30,
      showPageCorners: true,
      disableFlipByClick: false,
      startPage: this.startPage,
    });

    this.pageFlip.on('flip', (e) => {
      this.startPage = e.data as number;
      this.emitter.emit('flip', this.getState());
    });
    this.pageFlip.on('changeState', (e) => {
      this.emitter.emit('stateChange', e.data as FlipViewState);
    });
    this.pageFlip.on('changeOrientation', (e) => {
      this.emitter.emit('orientationChange', e.data as FlipOrientation);
    });

    if (this.pages.length > 0) this.pageFlip.loadFromHTML(this.pages);
  }

  /** Establece las páginas del libro y arranca el visor. */
  setPages(pages: HTMLElement[], startPage = 0): void {
    this.pages = pages;
    this.startPage = startPage;
    this.mount();
    this.observeResize();
  }

  /** Re-render de las páginas actuales (p. ej. tras cambiar de escala). */
  updatePages(pages: HTMLElement[]): void {
    this.pages = pages;
    this.pageFlip?.loadFromHTML(pages);
  }

  private observeResize(): void {
    if (!this.options.autoResize || this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.pageFlip?.update(), RESIZE_DEBOUNCE_MS);
    });
    this.resizeObserver.observe(this.container);
  }

  getState(): FlipState {
    return {
      currentPage: this.pageFlip?.getCurrentPageIndex() ?? this.startPage,
      totalPages: this.pages.length,
    };
  }

  flipNext(): void {
    this.pageFlip?.flipNext();
  }

  flipPrev(): void {
    this.pageFlip?.flipPrev();
  }

  /** Salta a una página por índice 0-based. */
  flipToPage(pageIndex: number): void {
    this.pageFlip?.flip(pageIndex);
  }

  /** Cambia entre vista simple y doble preservando la página actual. */
  setDisplayMode(mode: DisplayMode): void {
    if (mode === this.options.displayMode) return;
    this.options.displayMode = mode;
    this.startPage = this.pageFlip?.getCurrentPageIndex() ?? this.startPage;
    this.mount();
  }

  getDisplayMode(): DisplayMode {
    return this.options.displayMode;
  }

  on<K extends keyof FlipViewEvents>(
    event: K,
    handler: (payload: FlipViewEvents[K]) => void,
  ): () => void {
    return this.emitter.on(event, handler);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.pageFlip?.destroy();
    this.pageFlip = null;
    this.pages = [];
    this.emitter.clear();
  }
}

export function createFlipView(container: HTMLElement, options: FlipViewOptions): FlipView {
  return new FlipView(container, options);
}
