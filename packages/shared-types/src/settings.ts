/** Modos de color de lectura */
export type ColorMode = 'normal' | 'sepia' | 'dark' | 'paper';

/** Modo de visualización del libro */
export type DisplayMode = 'single' | 'double';

export interface ReadingSettings {
  colorMode: ColorMode;
  displayMode: DisplayMode;
  /** Escala de renderizado base (1 = tamaño natural del PDF) */
  scale: number;
  /** Velocidad del sintetizador de voz (0.5 - 2) */
  ttsRate: number;
  /** URI de voz TTS preferida, null = voz del sistema */
  ttsVoice: string | null;
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  colorMode: 'normal',
  displayMode: 'double',
  scale: 1.5,
  ttsRate: 1,
  ttsVoice: null,
};
