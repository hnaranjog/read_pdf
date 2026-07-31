import type { Annotation, AnnotationKind, Bookmark, NewAnnotation, NewBookmark } from '@readpdf/shared-types';
import type { StorageAdapter } from '../adapter.js';

interface BookmarkRow {
  id: number;
  document_id: number;
  page_number: number;
  note: string;
  created_at: string;
}

interface AnnotationRow extends BookmarkRow {
  kind: string;
  text: string;
  color: string;
}

function toBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    documentId: row.document_id,
    pageNumber: row.page_number,
    note: row.note,
    createdAt: row.created_at,
  };
}

function toAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    documentId: row.document_id,
    pageNumber: row.page_number,
    kind: row.kind as AnnotationKind,
    text: row.text,
    color: row.color,
    createdAt: row.created_at,
  };
}

export class BookmarkRepo {
  constructor(private readonly db: StorageAdapter) {}

  async listByDocument(documentId: number): Promise<Bookmark[]> {
    const rows = await this.db.query<BookmarkRow>(
      'SELECT * FROM bookmarks WHERE document_id = ? ORDER BY page_number',
      [documentId],
    );
    return rows.map(toBookmark);
  }

  async add(bookmark: NewBookmark): Promise<Bookmark> {
    const result = await this.db.execute(
      'INSERT INTO bookmarks (document_id, page_number, note) VALUES (?, ?, ?)',
      [bookmark.documentId, bookmark.pageNumber, bookmark.note],
    );
    const rows = await this.db.query<BookmarkRow>(
      'SELECT * FROM bookmarks WHERE id = ?',
      [result.lastId],
    );
    return toBookmark(rows[0]);
  }

  async remove(id: number): Promise<number> {
    const result = await this.db.execute('DELETE FROM bookmarks WHERE id = ?', [id]);
    return result.changes;
  }
}

export class AnnotationRepo {
  constructor(private readonly db: StorageAdapter) {}

  async listByDocument(documentId: number): Promise<Annotation[]> {
    const rows = await this.db.query<AnnotationRow>(
      'SELECT * FROM annotations WHERE document_id = ? ORDER BY page_number',
      [documentId],
    );
    return rows.map(toAnnotation);
  }

  async add(annotation: NewAnnotation): Promise<Annotation> {
    const result = await this.db.execute(
      'INSERT INTO annotations (document_id, page_number, kind, text, color) VALUES (?, ?, ?, ?, ?)',
      [annotation.documentId, annotation.pageNumber, annotation.kind, annotation.text, annotation.color],
    );
    const rows = await this.db.query<AnnotationRow>(
      'SELECT * FROM annotations WHERE id = ?',
      [result.lastId],
    );
    return toAnnotation(rows[0]);
  }

  async remove(id: number): Promise<number> {
    const result = await this.db.execute('DELETE FROM annotations WHERE id = ?', [id]);
    return result.changes;
  }
}
