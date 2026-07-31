import type { StorageAdapter } from './adapter.js';
import { SCHEMA_SQL } from './schema.js';
import { SqlJsAdapter } from './adapters/sql-js.js';
import { createWebPersistence } from './adapters/opfs-persistence.js';
import { TauriSqlAdapter } from './adapters/tauri-sql.js';
import { UserRepo } from './repositories/user-repo.js';
import { DocumentRepo } from './repositories/document-repo.js';
import { AnnotationRepo, BookmarkRepo } from './repositories/bookmark-repo.js';
import { SettingsRepo } from './repositories/settings-repo.js';

export type Platform = 'tauri' | 'web';

export function detectPlatform(): Platform {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    ? 'tauri'
    : 'web';
}

/**
 * Fachada de persistencia: adapter + schema + repositorios.
 *
 * ```ts
 * const db = await Database.create();
 * const user = await db.users.create({ name: 'Ana', email: 'ana@x.com' });
 * ```
 */
export class Database {
  readonly users: UserRepo;
  readonly documents: DocumentRepo;
  readonly bookmarks: BookmarkRepo;
  readonly annotations: AnnotationRepo;
  readonly settings: SettingsRepo;

  private constructor(private readonly adapter: StorageAdapter) {
    this.users = new UserRepo(adapter);
    this.documents = new DocumentRepo(adapter);
    this.bookmarks = new BookmarkRepo(adapter);
    this.annotations = new AnnotationRepo(adapter);
    this.settings = new SettingsRepo(adapter);
  }

  static async create(platform: Platform = detectPlatform()): Promise<Database> {
    const adapter: StorageAdapter =
      platform === 'tauri'
        ? new TauriSqlAdapter()
        : new SqlJsAdapter({ persistence: createWebPersistence() });

    await adapter.init();
    for (const statement of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await adapter.execute(statement);
    }
    return new Database(adapter);
  }

  /** Crea una Database sobre un adapter arbitrario (tests). */
  static async fromAdapter(adapter: StorageAdapter): Promise<Database> {
    await adapter.init();
    for (const statement of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await adapter.execute(statement);
    }
    return new Database(adapter);
  }

  async close(): Promise<void> {
    await this.adapter.close();
  }
}
