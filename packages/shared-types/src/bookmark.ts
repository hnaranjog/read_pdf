export interface Bookmark {
  id: number;
  documentId: number;
  /** Página 1-based */
  pageNumber: number;
  note: string;
  createdAt: string;
}

export type NewBookmark = Omit<Bookmark, 'id' | 'createdAt'>;

export type AnnotationKind = 'highlight' | 'underline' | 'note';

export interface Annotation {
  id: number;
  documentId: number;
  pageNumber: number;
  kind: AnnotationKind;
  /** Texto seleccionado o contenido de la nota */
  text: string;
  /** Color CSS del resaltado */
  color: string;
  createdAt: string;
}

export type NewAnnotation = Omit<Annotation, 'id' | 'createdAt'>;
