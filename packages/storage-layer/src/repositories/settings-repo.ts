import type { StorageAdapter } from '../adapter.js';

interface SettingRow {
  key: string;
  value: string;
}

/** Settings clave-valor con serialización JSON. */
export class SettingsRepo {
  constructor(private readonly db: StorageAdapter) {}

  async get<T>(key: string): Promise<T | null> {
    const rows = await this.db.query<SettingRow>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    if (rows.length === 0) return null;
    try {
      return JSON.parse(rows[0].value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.db.execute(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, JSON.stringify(value)],
    );
  }

  async remove(key: string): Promise<void> {
    await this.db.execute('DELETE FROM settings WHERE key = ?', [key]);
  }
}
