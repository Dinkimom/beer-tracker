import { query } from '@/lib/db';

export async function fetchDocumentForVersioning(
  featureId: string,
  documentId: string
): Promise<{ content: string; name: string } | null> {
  const result = await query(
    `SELECT name, content FROM feature_documents
       WHERE id = $1 AND feature_id = $2`,
    [documentId, featureId]
  );
  return (result.rows[0] as { content: string; name: string } | undefined) ?? null;
}

export async function fetchLastDocumentVersion(
  documentId: string
): Promise<{ content: string; name: string } | null> {
  const result = await query(
    `SELECT content, name FROM document_versions
       WHERE document_id = $1
       ORDER BY version_number DESC
       LIMIT 1`,
    [documentId]
  );
  return (result.rows[0] as { content: string; name: string } | undefined) ?? null;
}

export async function nextDocumentVersionNumber(documentId: string): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(version_number), 0) as max_version
       FROM document_versions
       WHERE document_id = $1`,
    [documentId]
  );
  return ((result.rows[0] as { max_version?: number } | undefined)?.max_version ?? 0) + 1;
}

export async function insertDocumentVersion(input: {
  content: string;
  documentId: string;
  featureId: string;
  name: string;
  versionNumber: number;
}): Promise<unknown> {
  const result = await query(
    `INSERT INTO document_versions (document_id, feature_id, content, name, version_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, version_number, created_at`,
    [input.documentId, input.featureId, input.content, input.name, input.versionNumber]
  );
  return result.rows[0];
}

export async function listDocumentVersions(documentId: string): Promise<unknown[]> {
  const result = await query(
    `SELECT 
        id,
        version_number as "versionNumber",
        created_at as "createdAt",
        name
      FROM document_versions
      WHERE document_id = $1
      ORDER BY created_at DESC`,
    [documentId]
  );
  return result.rows;
}

export async function fetchDocumentVersionById(
  documentId: string,
  versionId: string
): Promise<unknown | null> {
  const result = await query(
    `SELECT 
        id,
        document_id as "documentId",
        feature_id as "featureId",
        content,
        name,
        version_number as "versionNumber",
        created_at as "createdAt"
      FROM document_versions
      WHERE id = $1 AND document_id = $2`,
    [versionId, documentId]
  );
  return result.rows[0] ?? null;
}
