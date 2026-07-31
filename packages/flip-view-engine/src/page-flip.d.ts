/**
 * Declaración de tipos para 'page-flip' (StPageFlip) — el paquete npm
 * no incluye .d.ts. Solo cubre la superficie de API que usa FlipView.
 * Ref: https://nodlik.github.io/StPageFlip/
 */
declare module 'page-flip' {
  export type SizeType = 'fixed' | 'stretch';
  export type FlipCorner = 'top' | 'bottom';
  export type PageOrientation = 'portrait' | 'landscape';
  export type PageState = 'user_fold' | 'fold_corner' | 'flipping' | 'read';
  export type PageDensity = 'soft' | 'hard';

  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: SizeType;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  }

  export interface PageFlipEvent {
    data: number | string | PageState | PageOrientation;
    object: PageFlip;
  }

  export type PageFlipEventName =
    | 'flip'
    | 'changeState'
    | 'changeOrientation'
    | 'init'
    | 'update';

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);

    on(eventName: PageFlipEventName, callback: (e: PageFlipEvent) => void): void;

    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;

    update(): void;
    updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void;

    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): PageOrientation;

    turnToPage(pageNum: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;

    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    flip(pageNum: number, corner?: FlipCorner): void;

    destroy(): void;
  }
}
