import type { ExecuteResult, StorageAdapter } from '../adapter.js';

interface TauriDatabase {
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number; lastInsertId: number }>;
  close(): Promise<boolean>;
}

const DB_PATH = 'sqlite:readpdf.db';

/**
 * Adapter SQLite nativo para Tauri v2 (@tauri-apps/plugin-sql).
 * El import es dinámico para que el bundle web no arrastre el plugin.
 */
export class TauriSqlAdapter implements StorageAdapter {
  private db: TauriDatabase | null = null;

  async init(): Promise<void> {
    const plugin = (await import('@tauri-apps/plugin-sql')) as unknown as {
      default: { load: (path: string) => Promise<TauriDatabase> };
    };
    this.db = await plugin.default.load(DB_PATH);
  }

  private getDb(): TauriDatabase {
    if (!this.db) throw new Error('TauriSqlAdapter no inicializado — llama a init() primero');
    return this.db;
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.getDb().select<T[]>(sql, params);
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const result = await this.getDb().execute(sql, params);
    return { changes: result.rowsAffected, lastId: result.lastInsertId };
  }

  async close(): Promise<void> {
    await this.db?.close();
    this.db = null;
  }
}
