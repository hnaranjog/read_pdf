import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Database } from './database.js';
import { SqlJsAdapter, NO_PERSISTENCE } from './adapters/sql-js.js';

const require = createRequire(import.meta.url);

/** Adapter sql.js sin persistencia, con el wasm resuelto desde node_modules (Node) */
function createTestAdapter(): SqlJsAdapter {
  return new SqlJsAdapter({
    persistence: NO_PERSISTENCE,
    wasmLocateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  });
}

describe('storage-layer (sql.js en Node)', () => {
  it('aplica el schema sin errores', async () => {
    const db = await Database.fromAdapter(createTestAdapter());
    await db.close();
  });

  it('CRUD de usuarios', async () => {
    const db = await Database.fromAdapter(createTestAdapter());

    const user = await db.users.create({ name: 'Ana', email: 'ana@test.com' });
    expect(user.id).toBeGreaterThan(0);
    expect(user.createdAt).toBeTruthy();

    expect(await db.users.getByEmail('ana@test.com')).toMatchObject({ name: 'Ana' });

    const changes = await db.users.update(user.id, { name: 'Ana María' });
    expect(changes).toBe(1);
    expect(await db.users.getById(user.id)).toMatchObject({ name: 'Ana María' });

    expect(await db.users.remove(user.id)).toBe(1);
    expect(await db.users.getById(user.id)).toBeNull();
    await db.close();
  });

  it('documentos y posición de lectura', async () => {
    const db = await Database.fromAdapter(createTestAdapter());
    const user = await db.users.create({ name: 'Beto', email: 'beto@test.com' });

    const doc = await db.documents.create({
      userId: user.id,
      title: 'Mi libro',
      fileName: 'libro.pdf',
      fileSize: 12345,
      filePath: 'opfs://libro.pdf',
      numPages: 42,
      lastOpenedPage: 1,
    });

    await db.documents.updateReadingPosition(doc.id, 17);
    const updated = await db.documents.getById(doc.id);
    expect(updated?.lastOpenedPage).toBe(17);

    await db.documents.updateMeta(doc.id, { numPages: 99, filePath: 'pdfs/1.pdf' });
    const metaUpdated = await db.documents.getById(doc.id);
    expect(metaUpdated?.numPages).toBe(99);
    expect(metaUpdated?.filePath).toBe('pdfs/1.pdf');

    expect(await db.documents.findByPath(user.id, 'pdfs/1.pdf')).toMatchObject({ title: 'Mi libro' });
    expect(await db.documents.findByPath(user.id, 'opfs://inexistente.pdf')).toBeNull();

    expect(await db.documents.listByUser(user.id)).toHaveLength(1);
    await db.close();
  });

  it('bookmarks, anotaciones y settings', async () => {
    const db = await Database.fromAdapter(createTestAdapter());
    const user = await db.users.create({ name: 'Cora', email: 'cora@test.com' });
    const doc = await db.documents.create({
      userId: user.id,
      title: 'Otro',
      fileName: 'otro.pdf',
      fileSize: 1,
      filePath: 'opfs://otro.pdf',
      numPages: 10,
      lastOpenedPage: 1,
    });

    const bm = await db.bookmarks.add({ documentId: doc.id, pageNumber: 3, note: 'Capítulo clave' });
    expect(bm.id).toBeGreaterThan(0);
    expect(await db.bookmarks.listByDocument(doc.id)).toHaveLength(1);

    await db.annotations.add({
      documentId: doc.id,
      pageNumber: 3,
      kind: 'highlight',
      text: 'texto resaltado',
      color: '#ffeb3b',
    });
    expect(await db.annotations.listByDocument(doc.id)).toHaveLength(1);

    await db.settings.set('reading', { colorMode: 'sepia' });
    expect(await db.settings.get<{ colorMode: string }>('reading')).toEqual({ colorMode: 'sepia' });

    await db.close();
  });

  it('persiste datos entre instancias con los mismos hooks', async () => {
    let stored: Uint8Array | null = null;
    const hooks = {
      load: async () => stored,
      save: async (data: Uint8Array) => { stored = data; },
    };
    const locate = (file: string) => require.resolve(`sql.js/dist/${file}`);

    const db1 = await Database.fromAdapter(new SqlJsAdapter({ persistence: hooks, wasmLocateFile: locate }));
    await db1.users.create({ name: 'Dani', email: 'dani@test.com' });
    await db1.close(); // close hace flush

    const db2 = await Database.fromAdapter(new SqlJsAdapter({ persistence: hooks, wasmLocateFile: locate }));
    expect(await db2.users.getByEmail('dani@test.com')).toMatchObject({ name: 'Dani' });
    await db2.close();
  });
});
