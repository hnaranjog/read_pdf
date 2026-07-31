/// <reference path="./env.d.ts" />
import initSqlJs, { type Database as SqlJsDatabase, type SqlValue } from 'sql.js';
import type { ExecuteResult, StorageAdapter } from '../adapter.js';

export interface PersistenceHooks {
  /** Bytes previos de la DB, null si es la primera vez */
  load: () => Promise<Uint8Array | null>;
  /** Persiste el volcado completo de la DB */
  save: (data: Uint8Array) => Promise<void>;
}

/** Persistencia volátil — para tests y sesiones efímeras */
export const NO_PERSISTENCE: PersistenceHooks = {
  load: async () => null,
  save: async () => {},
};

export interface SqlJsAdapterOptions {
  persistence?: PersistenceHooks;
  /** Ruta/URL del wasm — en Node (tests) pasar la ruta del archivo */
  wasmLocateFile?: (file: string) => string;
}

const SAVE_DEBOUNCE_MS = 500;

/**
 * Adapter SQLite sobre sql.js (wasm). La persistencia es intercambiable
 * vía hooks: OPFS en web moderna, IndexedDB como fallback, no-op en tests.
 */
export class SqlJsAdapter implements StorageAdapter {
  private db: SqlJsDatabase | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly persistence: PersistenceHooks;
  private readonly wasmLocateFile?: (file: string) => string;

  constructor(options: SqlJsAdapterOptions = {}) {
    this.persistence = options.persistence ?? NO_PERSISTENCE;
    this.wasmLocateFile = options.wasmLocateFile;
  }

  async init(): Promise<void> {
    let locateFile = this.wasmLocateFile;
    if (!locateFile) {
      // Import perezoso del wasm: solo en browser. En Node/tests el
      // consumidor inyecta wasmLocateFile y esta línea nunca se ejecuta
      // (el sufijo ?url no es resoluble por Node).
      const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default;
      locateFile = () => wasmUrl;
    }
    const SQL = await initSqlJs({ locateFile });
    const existing = await this.persistence.load();
    this.db = existing ? new SQL.Database(existing) : new SQL.Database();
  }

  private getDb(): SqlJsDatabase {
    if (!this.db) throw new Error('SqlJsAdapter no inicializado — llama a init() primero');
    return this.db;
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.getDb().prepare(sql);
    try {
      stmt.bind(params as SqlValue[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const db = this.getDb();
    db.run(sql, params as SqlValue[]);
    const changes = db.getRowsModified();
    const lastIdRows = await this.query<{ id: number }>('SELECT last_insert_rowid() AS id');
    this.scheduleSave();
    return { changes, lastId: lastIdRows[0]?.id ?? 0 };
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  /** Fuerza el volcado inmediato a la persistencia. */
  async flush(): Promise<void> {
    if (!this.db) return;
    await this.persistence.save(this.db.export());
  }

  async close(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.flush();
    this.db?.close();
    this.db = null;
  }
}
