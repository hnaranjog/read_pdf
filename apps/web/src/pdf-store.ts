/**
 * Almacén de binarios PDF en OPFS (Origin Private File System).
 * Sin OPFS disponible la biblioteca pierde los archivos entre sesiones,
 * pero la base de datos sigue funcionando (fallback IndexedDB).
 */

function hasOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.getDirectory === 'function'
  );
}

async function pdfsDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('pdfs', { create: true });
}

export function pdfStoreAvailable(): boolean {
  return hasOpfs();
}

export async function savePdfFile(key: string, data: Uint8Array): Promise<boolean> {
  if (!hasOpfs()) return false;
  const dir = await pdfsDir();
  const handle = await dir.getFileHandle(key, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data as FileSystemWriteChunkType);
  await writable.close();
  return true;
}

export async function loadPdfFile(key: string): Promise<Uint8Array | null> {
  if (!hasOpfs()) return null;
  try {
    const dir = await pdfsDir();
    const handle = await dir.getFileHandle(key);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

export async function removePdfFile(key: string): Promise<void> {
  if (!hasOpfs()) return;
  try {
    const dir = await pdfsDir();
    await dir.removeEntry(key);
  } catch {
    // el archivo ya no existe
  }
}
