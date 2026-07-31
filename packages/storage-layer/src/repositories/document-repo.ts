import type { DocumentMeta, NewDocument } from '@readpdf/shared-types';
import type { StorageAdapter } from '../adapter.js';

interface DocumentRow {
  id: number;
  user_id: number;
  title: string;
  file_name: string;
  file_size: number;
  file_path: string;
  num_pages: number;
  last_opened_page: number;
  created_at: string;
  updated_at: string;
}

function toDocument(row: DocumentRow): DocumentMeta {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    fileName: row.file_name,
    fileSize: row.file_size,
    filePath: row.file_path,
    numPages: row.num_pages,
    lastOpenedPage: row.last_opened_page,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DocumentRepo {
  constructor(private readonly db: StorageAdapter) {}

  async listByUser(userId: number): Promise<DocumentMeta[]> {
    const rows = await this.db.query<DocumentRow>(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC',
      [userId],
    );
    return rows.map(toDocument);
  }

  async getById(id: number): Promise<DocumentMeta | null> {
    const rows = await this.db.query<DocumentRow>(
      'SELECT * FROM documents WHERE id = ?',
      [id],
    );
    return rows.length > 0 ? toDocument(rows[0]) : null;
  }

  /** Busca por ruta de archivo — clave para reanudar lectura de un PDF ya abierto */
  async findByPath(userId: number, filePath: string): Promise<DocumentMeta | null> {
    const rows = await this.db.query<DocumentRow>(
      'SELECT * FROM documents WHERE user_id = ? AND file_path = ?',
      [userId, filePath],
    );
    return rows.length > 0 ? toDocument(rows[0]) : null;
  }

  async create(doc: NewDocument): Promise<DocumentMeta> {
    const result = await this.db.execute(
      `INSERT INTO documents (user_id, title, file_name, file_size, file_path, num_pages, last_opened_page)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [doc.userId, doc.title, doc.fileName, doc.fileSize, doc.filePath, doc.numPages, doc.lastOpenedPage],
    );
    const created = await this.getById(result.lastId);
    if (!created) throw new Error('No se pudo recuperar el documento creado');
    return created;
  }

  /** Actualiza la posición de lectura y toca updated_at. */
  async updateReadingPosition(id: number, page: number): Promise<void> {
    await this.db.execute(
      `UPDATE documents SET last_opened_page = ?, updated_at = datetime('now') WHERE id = ?`,
      [page, id],
    );
  }

  /** Actualiza metadatos conocidos tras el alta (p. ej. numPages, filePath) */
  async updateMeta(id: number, meta: { numPages?: number; filePath?: string }): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];
    if (meta.numPages !== undefined) { fields.push('num_pages = ?'); params.push(meta.numPages); }
    if (meta.filePath !== undefined) { fields.push('file_path = ?'); params.push(meta.filePath); }
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    params.push(id);
    await this.db.execute(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  async remove(id: number): Promise<number> {
    const result = await this.db.execute('DELETE FROM documents WHERE id = ?', [id]);
    return result.changes;
  }
}
