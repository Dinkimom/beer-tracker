import { query } from '@/lib/db';

interface DocumentTypeRow {
  code: string;
  contentFormat: string;
  createdAt: string;
  editorType: string;
  iconName: string;
  id: string;
}

export async function listDocumentTypes(): Promise<DocumentTypeRow[]> {
  const result = await query(
    `SELECT 
        id,
        code,
        name,
        icon_name as "iconName",
        editor_type as "editorType",
        content_format as "contentFormat",
        created_at as "createdAt"
      FROM document_types
      ORDER BY id ASC`
  );
  return result.rows as DocumentTypeRow[];
}
