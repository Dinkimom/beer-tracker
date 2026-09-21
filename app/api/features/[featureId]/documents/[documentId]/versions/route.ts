import { NextRequest, NextResponse } from 'next/server';

import {
  featureDocumentExists,
  listDocumentVersions,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';

/**
 * GET /api/features/[featureId]/documents/[documentId]/versions
 * Получить список версий документа (changelog)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; documentId: string }> | { featureId: string; documentId: string } }
) {
  try {
    const { featureId, documentId } = await resolveParams(params);

    const exists = await featureDocumentExists(featureId, documentId);

    if (!exists) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const versions = await listDocumentVersions(documentId);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching document versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document versions' },
      { status: 500 }
    );
  }
}
