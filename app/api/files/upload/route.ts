import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Загружает SVG файл на сервер
 * POST /api/files/upload
 * Body: { svg: string, filename?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { svg, filename } = body;

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

    // Генерируем имя файла, если не указано
    const fileId = filename || `diagram-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const filePath = join(uploadsDir, `${fileId}.svg`);

    // Сохраняем SVG файл
    await writeFile(filePath, svg, 'utf-8');

    // Возвращаем URL для доступа к файлу
    const fileUrl = `/uploads/diagrams/${fileId}.svg`;

    return NextResponse.json({
      url: fileUrl,
      filename: `${fileId}.svg`,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

