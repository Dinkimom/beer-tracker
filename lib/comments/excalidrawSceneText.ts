import type { ExcalidrawCommentScene } from '@/lib/comments/excalidrawCommentPayload';

import { isRecord } from '@/lib/isRecord';


function readElementText(element: Record<string, unknown>): string | null {
  for (const key of ['originalText', 'text'] as const) {
    const value = element[key];
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Текст с холста Excalidraw (элементы `text` и подписи на фигурах) — без сырой сцены.
 */
export function extractExcalidrawSceneText(scene: ExcalidrawCommentScene): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const element of scene.elements) {
    if (!isRecord(element) || element.isDeleted === true) {
      continue;
    }
    const text = readElementText(element);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    out.push(text);
  }
  return out;
}
