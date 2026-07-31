/** Dirección de paso de página */
export type FlipDirection = 'next' | 'prev';

/**
 * Estado del visor flip. `currentPage` es el índice 0-based
 * de la página izquierda del spread actual (convención de page-flip).
 */
export interface FlipState {
  currentPage: number;
  totalPages: number;
}

export type FlipEventName = 'flip' | 'changeState' | 'changeOrientation';

export type FlipViewState = 'user_fold' | 'fold_corner' | 'flipping' | 'read';

export type FlipOrientation = 'portrait' | 'landscape';
