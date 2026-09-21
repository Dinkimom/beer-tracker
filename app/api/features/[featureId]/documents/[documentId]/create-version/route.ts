import { NextRequest, NextResponse } from 'next/server';

import {
  fetchDocumentForVersioning,
  fetchLastDocumentVersion,
  insertDocumentVersion,
  nextDocumentVersionNumber,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';

/**
 * POST /api/features/[featureId]/documents/[documentId]/create-version
 * Создать версию документа (вызывается при закрытии документа)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; documentId: string }> | { featureId: string; documentId: string } }
) {
  try {
    const { featureId, documentId } = await resolveParams(params);

    const currentDoc = await fetchDocumentForVersioning(featureId, documentId);

    if (!currentDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const lastVersion = await fetchLastDocumentVersion(documentId);

    const currentContent = currentDoc.content ?? '';
    const lastVersionContent = lastVersion?.content ?? '';

    // Создаем версию только если содержимое изменилось с момента последней версии
    if (lastVersion && currentContent === lastVersionContent && currentDoc.name === lastVersion.name) {
      return NextResponse.json({
        message: 'No changes since last version',
        versionCreated: false
      });
    }

    const nextVersionNumber = await nextDocumentVersionNumber(documentId);

    const version = await insertDocumentVersion({
      documentId,
      featureId,
      content: currentContent,
      name: currentDoc.name || '',
      versionNumber: nextVersionNumber,
    });

    return NextResponse.json({
      version,
      versionCreated: true,
    });
  } catch (error: unknown) {
    // Логируем ошибку, но не возвращаем ошибку клиенту
    // Это может произойти если таблица document_versions не существует
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Could not create document version (table may not exist):', errorMessage);

    return NextResponse.json({
      message: 'Version creation skipped (table may not exist)',
      versionCreated: false,
    });
  }
}
