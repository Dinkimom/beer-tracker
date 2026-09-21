import { NextRequest, NextResponse } from 'next/server';

import {
  featureDocumentExists,
  fetchDocumentVersionById,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';

/**
 * GET /api/features/[featureId]/documents/[documentId]/versions/[versionId]
 * Получить содержимое конкретной версии документа
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; documentId: string; versionId: string }> | { featureId: string; documentId: string; versionId: string } }
) {
  try {
    const { featureId, documentId, versionId } = await resolveParams(params);

    const exists = await featureDocumentExists(featureId, documentId);

    if (!exists) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const version = await fetchDocumentVersionById(documentId, versionId);

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error('Error fetching document version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document version' },
      { status: 500 }
    );
  }
}
