import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { resolveParams } from '@/lib/nextjs-utils';

/**
 * POST /api/features/[featureId]/diagrams/[diagramId]/image
 * Сохранить экспортированное изображение диаграммы (SVG экспортируется на клиенте)
 * Body: { svg: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; diagramId: string }> | { featureId: string; diagramId: string } }
) {
  try {
    const { diagramId } = await resolveParams(params);
    const body = await request.json();
    const { svg } = body;

    if (!svg || typeof svg !== 'string') {
      return NextResponse.json(
        { error: 'SVG content is required' },
        { status: 400 }
      );
    }

    // Создаем папку для хранения файлов, если её нет
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'diagrams');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Используем стабильное имя файла для каждой диаграммы (перезаписываем при обновлении)
    const fileId = `diagram-${diagramId}`;
    const filePath = join(uploadsDir, `${fileId}.svg`);

    // Сохраняем SVG файл (перезаписываем существующий, если есть)
    await writeFile(filePath, svg, 'utf-8');

    // Возвращаем стабильный URL для доступа к файлу
    // Добавляем timestamp как query параметр для обхода кеша браузера
    const fileUrl = `/uploads/diagrams/${fileId}.svg?v=${Date.now()}`;

    return NextResponse.json({
      url: fileUrl,
      filename: `${fileId}.svg`,
    });
  } catch (error) {
    console.error('Error saving diagram image:', error);
    return NextResponse.json(
      { error: 'Failed to save diagram image' },
      { status: 500 }
    );
  }
}

