export type { StorageAdapter, ExecuteResult } from './adapter.js';
export { Database, detectPlatform } from './database.js';
export type { Platform } from './database.js';
export { SqlJsAdapter, NO_PERSISTENCE } from './adapters/sql-js.js';
export type { PersistenceHooks } from './adapters/sql-js.js';
export { TauriSqlAdapter } from './adapters/tauri-sql.js';
export { createWebPersistence } from './adapters/opfs-persistence.js';
