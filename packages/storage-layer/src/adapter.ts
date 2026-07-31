export interface ExecuteResult {
  /** Filas afectadas por INSERT/UPDATE/DELETE */
  changes: number;
  /** ROWID de la última fila insertada (0 si no aplica) */
  lastId: number;
}

/**
 * Contrato mínimo de persistencia SQLite. Implementaciones:
 * - TauriSqlAdapter (desktop, SQLite nativo via plugin)
 * - SqlJsAdapter (web, sql.js wasm + persistencia OPFS/IndexedDB)
 */
export interface StorageAdapter {
  init(): Promise<void>;
  /** SELECT — devuelve filas como objetos */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** INSERT/UPDATE/DELETE/DDL */
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  close(): Promise<void>;
}
