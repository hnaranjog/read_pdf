/// <reference path="./env.d.ts" />
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {
  PageTextContent,
  PdfDocumentHandle,
  PdfSource,
  RenderPageOptions,
  TocEntry,
} from '@readpdf/shared-types';
import { LruCache } from './lru-cache.js';

// Tauri v2's built-in asset protocol doesn't serve .mjs with the correct
// MIME type (application/javascript), which causes `new Worker(url, { type:
// 'module' })` to fail. Intercept Worker construction and for .mjs URLs
// create a thin Blob wrapper that re-imports the real module.
const OriginalWorker = globalThis.Worker;
const isTauri = '__TAURI_INTERNALS__' in globalThis;

if (isTauri) {
  globalThis.Worker = class extends (OriginalWorker as typeof Worker) {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      const urlStr = scriptURL.toString();
      if (urlStr.endsWith('.mjs') && options?.type === 'module') {
        const blob = new Blob(
          [`import '${urlStr}';`],
          { type: 'application/javascript' },
        );
        super(URL.createObjectURL(blob), options);
      } else {
        super(scriptURL, options);
      }
    }
  };
}

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const DEFAULT_SCALE = 1.5;
/** DPR máximo para no explotar memoria en pantallas retina */
const MAX_DPR = 2;
/** Canvases cacheados (~12 spreads dobles en pantalla) */
const CACHE_SIZE = 24;

const documents = new Map<string, PDFDocumentProxy>();
const pendingRenders = new Map<string, Promise<HTMLCanvasElement>>();

// NOTA: al expulsar solo se suelta la referencia de caché. Los canvas pueden
// seguir montados en el DOM (páginas del flip) — ponerlos a 0 los borraría
// visualmente (bug: páginas en blanco tras renderizar >CACHE_SIZE páginas).
const canvasCache = new LruCache<HTMLCanvasElement>(CACHE_SIZE);

function effectiveDpr(): number {
  return Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
}

function cacheKey(docId: string, pageNumber: number, scale: number): string {
  return `${docId}:${pageNumber}:${scale}:${effectiveDpr()}`;
}

/** Carga un PDF y devuelve un handle opaco para el resto de operaciones. */
export async function loadPdf(source: PdfSource): Promise<PdfDocumentHandle> {
  let data: Uint8Array | undefined;
  let url: string | undefined;

  if (typeof source === 'string') {
    url = source;
  } else if (source instanceof ArrayBuffer) {
    data = new Uint8Array(source);
  } else if (source instanceof Uint8Array) {
    data = source;
  } else if (typeof File !== 'undefined' && source instanceof File) {
    data = new Uint8Array(await source.arrayBuffer());
  } else {
    throw new Error('PdfSource no soportado');
  }

  const doc = await pdfjsLib.getDocument(url ? { url } : { data }).promise;
  const id = crypto.randomUUID();
  documents.set(id, doc);

  return { id, numPages: doc.numPages, internal: doc };
}

function getDoc(handle: PdfDocumentHandle): PDFDocumentProxy {
  const doc = documents.get(handle.id);
  if (!doc) throw new Error(`Documento no cargado: ${handle.id}`);
  return doc;
}

/**
 * Renderiza una página a canvas. El canvas lleva en `style.width/height`
 * el tamaño CSS lógico (sin DPR) para que flip-view-engine pueda dimensionar
 * la página sin conocer el devicePixelRatio.
 */
export async function renderPage(
  handle: PdfDocumentHandle,
  pageNumber: number,
  options: RenderPageOptions = {},
): Promise<HTMLCanvasElement> {
  const scale = options.scale ?? DEFAULT_SCALE;
  if (pageNumber < 1 || pageNumber > handle.numPages) {
    throw new RangeError(`Página ${pageNumber} fuera de rango (1-${handle.numPages})`);
  }

  const key = cacheKey(handle.id, pageNumber, scale);
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const pending = pendingRenders.get(key);
  if (pending) return pending;

  const renderPromise = doRender(getDoc(handle), pageNumber, scale)
    .then((canvas) => {
      canvasCache.set(key, canvas);
      return canvas;
    })
    .finally(() => pendingRenders.delete(key));

  pendingRenders.set(key, renderPromise);
  return renderPromise;
}

async function doRender(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const dpr = effectiveDpr();
  const cssViewport = page.getViewport({ scale });
  const pixelViewport = page.getViewport({ scale: scale * dpr });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(pixelViewport.width);
  canvas.height = Math.floor(pixelViewport.height);
  canvas.style.width = `${Math.floor(cssViewport.width)}px`;
  canvas.style.height = `${Math.floor(cssViewport.height)}px`;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el contexto 2d del canvas');

  await page.render({ canvas, canvasContext: context, viewport: pixelViewport }).promise;
  page.cleanup();
  return canvas;
}

/** Miniatura a ancho fijo para el grid de páginas. */
export async function renderThumbnail(
  handle: PdfDocumentHandle,
  pageNumber: number,
  targetWidth = 160,
): Promise<HTMLCanvasElement> {
  const doc = getDoc(handle);
  const page = await doc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  return renderPage(handle, pageNumber, { scale: targetWidth / baseViewport.width });
}

/** Extrae la tabla de contenidos nativa del PDF (outline/bookmarks). */
export async function getOutline(handle: PdfDocumentHandle): Promise<TocEntry[]> {
  const doc = getDoc(handle);
  const outline = await doc.getOutline();
  if (!outline) return [];

  const resolve = async (items: typeof outline): Promise<TocEntry[]> => {
    const entries: TocEntry[] = [];
    for (const item of items) {
      entries.push({
        title: item.title,
        pageNumber: await resolveDestPage(doc, item.dest),
        children: item.items.length > 0 ? await resolve(item.items) : [],
      });
    }
    return entries;
  };

  return resolve(outline);
}

async function resolveDestPage(
  doc: PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<number | null> {
  try {
    let destArray = dest;
    if (typeof dest === 'string') destArray = await doc.getDestination(dest);
    if (!Array.isArray(destArray) || destArray.length === 0) return null;
    const ref = destArray[0] as { num: number; gen: number };
    return (await doc.getPageIndex(ref)) + 1;
  } catch {
    return null;
  }
}

/** Texto plano de una página (para TTS, búsqueda y diccionario). */
export async function getTextContent(
  handle: PdfDocumentHandle,
  pageNumber: number,
): Promise<PageTextContent> {
  const page: PDFPageProxy = await getDoc(handle).getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .filter((item) => 'str' in item)
    .map((item) => (item as { str: string }).str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { pageNumber, text };
}

/**
 * Obtiene las dimensiones CSS de una página a escala 1 sin renderizar.
 * Útil para calcular la escala de render óptima según el contenedor.
 */
export async function getPageDimensions(
  handle: PdfDocumentHandle,
  pageNumber: number,
): Promise<{ width: number; height: number }> {
  const doc = getDoc(handle);
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  page.cleanup();
  return { width: viewport.width, height: viewport.height };
}

/** Destruye el documento y libera sus canvases cacheados. */
export async function destroy(handle: PdfDocumentHandle): Promise<void> {
  canvasCache.deleteByPrefix(`${handle.id}:`);
  const doc = documents.get(handle.id);
  documents.delete(handle.id);
  if (doc) await doc.destroy();
}
