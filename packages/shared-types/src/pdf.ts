/** Origen de un PDF: archivo del navegador, bytes en memoria o ruta/URL */
export type PdfSource = File | ArrayBuffer | Uint8Array | string;

/**
 * Handle opaco a un documento PDF cargado.
 * `internal` contiene el PDFDocumentProxy de pdf.js — los consumidores
 * fuera de core-pdf-engine NO deben tocarlo.
 */
export interface PdfDocumentHandle {
  readonly id: string;
  readonly numPages: number;
  readonly internal: unknown;
}

export interface RenderPageOptions {
  /** Escala de renderizado (default: 1.5) */
  scale?: number;
}

/** Entrada de la tabla de contenidos (outline nativo del PDF) */
export interface TocEntry {
  title: string;
  /** Número de página 1-based, null si el destino no se pudo resolver */
  pageNumber: number | null;
  children: TocEntry[];
}

/** Resultado de extracción de texto de una página (para TTS/búsqueda/OCR) */
export interface PageTextContent {
  pageNumber: number;
  text: string;
}
