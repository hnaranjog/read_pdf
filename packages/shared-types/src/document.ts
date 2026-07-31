/** Metadata de un documento PDF registrado en la biblioteca local */
export interface DocumentMeta {
  id: number;
  userId: number;
  title: string;
  fileName: string;
  /** Tamaño en bytes */
  fileSize: number;
  /** Ruta del archivo en disco (desktop) o clave en OPFS (web) */
  filePath: string;
  numPages: number;
  /** Última página leída (1-based) para reanudar lectura */
  lastOpenedPage: number;
  createdAt: string;
  updatedAt: string;
}

export type NewDocument = Omit<DocumentMeta, 'id' | 'createdAt' | 'updatedAt'>;
