import { watch, type Ref } from 'vue';
import type { ColorMode } from '@readpdf/shared-types';

/**
 * Aplica el modo de color como atributo `data-color-mode` sobre el
 * elemento raíz del tema. La persistencia es responsabilidad de la app.
 */
export function useColorMode(target: Ref<HTMLElement | null>, mode: Ref<ColorMode>): void {
  watch(
    [target, mode],
    ([el, m]) => {
      el?.setAttribute('data-color-mode', m);
    },
    { immediate: true },
  );
}
