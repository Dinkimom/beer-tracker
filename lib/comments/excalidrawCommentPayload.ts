/** Маркер в `comments.text`: сцена Excalidraw, не обычная заметка. */
export const EXCALIDRAW_COMMENT_PREFIX = '<!--bt-excalidraw-v1-->';

/** Верхняя граница JSON сцены в S3 (не колонка comments.text). */
export const EXCALIDRAW_SCENE_MAX_BYTES = 2 * 1024 * 1024;

/** Верхняя граница названия/подписи в comments.text. */
export const PLANNER_COMMENT_TEXT_MAX_LENGTH = 5000;

export interface ExcalidrawCommentScene {
  appState?: Record<string, unknown>;
  elements: unknown[];
  files?: Record<string, unknown>;
  name?: string;
  v: 1;
}

export function emptyExcalidrawCommentScene(): ExcalidrawCommentScene {
  return { elements: [], v: 1 };
}

const EXCALIDRAW_SCENE_BACKGROUND_FALLBACK = '#ffffff';

/** Фон холста сцены, либо белый — для превью и колодца карточки. */
export function resolveExcalidrawSceneBackground(
  scene: ExcalidrawCommentScene | null | undefined
): string {
  const color = scene?.appState?.viewBackgroundColor;
  if (typeof color !== 'string') {
    return EXCALIDRAW_SCENE_BACKGROUND_FALLBACK;
  }
  const trimmed = color.trim();
  return trimmed ? trimmed : EXCALIDRAW_SCENE_BACKGROUND_FALLBACK;
}

export function isExcalidrawCommentText(text: string | null | undefined): boolean {
  return typeof text === 'string' && text.startsWith(EXCALIDRAW_COMMENT_PREFIX);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalTrimmedName(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseExcalidrawCommentScene(text: string): ExcalidrawCommentScene | null {
  if (!isExcalidrawCommentText(text)) {
    return null;
  }
  const raw = text.slice(EXCALIDRAW_COMMENT_PREFIX.length).trim();
  if (!raw) {
    return emptyExcalidrawCommentScene();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== 1 || !Array.isArray(parsed.elements)) {
      return emptyExcalidrawCommentScene();
    }
    return parseExcalidrawSceneRecord(parsed) ?? emptyExcalidrawCommentScene();
  } catch {
    return emptyExcalidrawCommentScene();
  }
}

export function encodeExcalidrawCommentScene(scene: ExcalidrawCommentScene): string {
  return `${EXCALIDRAW_COMMENT_PREFIX}${serializeExcalidrawScene(scene)}`;
}

export function serializeExcalidrawScene(scene: ExcalidrawCommentScene): string {
  const name = optionalTrimmedName(scene.name);
  return JSON.stringify({
    v: 1 as const,
    ...(name ? { name } : {}),
    elements: scene.elements,
    ...(scene.appState ? { appState: scene.appState } : {}),
    ...(scene.files ? { files: scene.files } : {}),
  });
}

export function parseExcalidrawSceneJson(raw: string): ExcalidrawCommentScene | null {
  try {
    return parseExcalidrawSceneRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseExcalidrawSceneRecord(parsed: unknown): ExcalidrawCommentScene | null {
  if (!isRecord(parsed) || parsed.v !== 1 || !Array.isArray(parsed.elements)) {
    return null;
  }
  const name = optionalTrimmedName(parsed.name);
  return {
    v: 1,
    elements: parsed.elements,
    ...(name ? { name } : {}),
    ...(isRecord(parsed.appState) ? { appState: parsed.appState } : {}),
    ...(isRecord(parsed.files) ? { files: parsed.files } : {}),
  };
}

export function trimExcalidrawSceneName(value: unknown): string | undefined {
  return optionalTrimmedName(value);
}

/** Переименовать схему в закодированном тексте комментария. */
export function encodeExcalidrawCommentWithName(
  encodedText: string,
  name: string
): string | null {
  const scene = parseExcalidrawCommentScene(encodedText);
  if (!scene) {
    return null;
  }
  return encodeExcalidrawCommentScene({
    ...scene,
    name: optionalTrimmedName(name),
  });
}

export function encodeEmptyExcalidrawComment(name?: string): string {
  const trimmedName = optionalTrimmedName(name);
  return encodeExcalidrawCommentScene({
    ...emptyExcalidrawCommentScene(),
    ...(trimmedName ? { name: trimmedName } : {}),
  });
}

function isDrawableExcalidrawElement(element: unknown): boolean {
  if (!isRecord(element)) {
    return false;
  }
  return element.isDeleted !== true && typeof element.type === 'string';
}

/** Есть ли на сцене хотя бы один неудалённый элемент для превью. */
export function excalidrawSceneHasDrawableElements(scene: ExcalidrawCommentScene): boolean {
  return scene.elements.some((element) => isDrawableExcalidrawElement(element));
}

export function listDrawableExcalidrawElements(scene: ExcalidrawCommentScene): unknown[] {
  return scene.elements.filter((element) => isDrawableExcalidrawElement(element));
}
