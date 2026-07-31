import type { NewUser, User } from '@readpdf/shared-types';
import type { StorageAdapter } from '../adapter.js';

interface UserRow {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

export class UserRepo {
  constructor(private readonly db: StorageAdapter) {}

  async list(): Promise<User[]> {
    const rows = await this.db.query<UserRow>('SELECT * FROM users ORDER BY name');
    return rows.map(toUser);
  }

  async getById(id: number): Promise<User | null> {
    const rows = await this.db.query<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    return rows.length > 0 ? toUser(rows[0]) : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    return rows.length > 0 ? toUser(rows[0]) : null;
  }

  async create(user: NewUser): Promise<User> {
    const result = await this.db.execute(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [user.name, user.email],
    );
    const created = await this.getById(result.lastId);
    if (!created) throw new Error('No se pudo recuperar el usuario creado');
    return created;
  }

  async update(id: number, user: Partial<NewUser>): Promise<number> {
    const fields: string[] = [];
    const params: unknown[] = [];
    if (user.name !== undefined) { fields.push('name = ?'); params.push(user.name); }
    if (user.email !== undefined) { fields.push('email = ?'); params.push(user.email); }
    if (fields.length === 0) return 0;
    params.push(id);
    const result = await this.db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
    return result.changes;
  }

  async remove(id: number): Promise<number> {
    const result = await this.db.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.changes;
  }
}
