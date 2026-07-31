import type { PersistenceHooks } from './sql-js.js';

const DB_FILENAME = 'readpdf.db';
const IDB_NAME = 'readpdf-storage';
const IDB_STORE = 'files';

function hasOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage?.getDirectory === 'function'
  );
}

/** Persistencia via Origin Private File System (navegadores modernos). */
function opfsHooks(): PersistenceHooks {
  async function fileHandle(create: boolean): Promise<FileSystemFileHandle> {
    const dir = await navigator.storage.getDirectory();
    return dir.getFileHandle(DB_FILENAME, { create });
  }

  return {
    async load() {
      try {
        const handle = await fileHandle(false);
        const file = await handle.getFile();
        return new Uint8Array(await file.arrayBuffer());
      } catch {
        return null; // no existe todavía
      }
    },
    async save(data) {
      const handle = await fileHandle(true);
      const writable = await handle.createWritable();
      await writable.write(data as FileSystemWriteChunkType);
      await writable.close();
    },
  };
}

/** Fallback a IndexedDB para navegadores sin OPFS. */
function indexedDbHooks(): PersistenceHooks {
  function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async load() {
      const idb = await openDb();
      try {
        return await new Promise<Uint8Array | null>((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readonly');
          const request = tx.objectStore(IDB_STORE).get(DB_FILENAME);
          request.onsuccess = () => {
            const result = request.result as Uint8Array | undefined;
            resolve(result ?? null);
          };
          request.onerror = () => reject(request.error);
        });
      } finally {
        idb.close();
      }
    },
    async save(data) {
      const idb = await openDb();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(data, DB_FILENAME);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        idb.close();
      }
    },
  };
}

/** Persistencia web con detección automática: OPFS si existe, IndexedDB si no. */
export function createWebPersistence(): PersistenceHooks {
  return hasOpfs() ? opfsHooks() : indexedDbHooks();
}
