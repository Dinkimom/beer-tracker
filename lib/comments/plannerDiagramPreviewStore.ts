import {
  excalidrawSceneHasDrawableElements,
  type ExcalidrawCommentScene,
} from '@/lib/comments/excalidrawCommentPayload';

const scenes = new Map<string, ExcalidrawCommentScene>();
const freshEditorIds = new Set<string>();
const listeners = new Set<() => void>();
let remoteEpoch = 0;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Сцена после сохранения — превью карточки читает её без повторного GET. */
export function rememberPlannerDiagramScene(
  commentId: string,
  scene: ExcalidrawCommentScene
): void {
  scenes.set(commentId, scene);
  emit();
}

export function getPlannerDiagramScene(commentId: string): ExcalidrawCommentScene | null {
  return scenes.get(commentId) ?? null;
}

export function getPlannerDiagramRemoteEpoch(): number {
  return remoteEpoch;
}

/** SSE: соседние вкладки перезапрашивают сцены из S3. */
export function bumpPlannerDiagramRemoteEpoch(): void {
  remoteEpoch += 1;
  emit();
}

export function subscribePlannerDiagramPreview(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/**
 * Локальный кэш на первом кадре не затираем GET'ом; после remote-epoch — перезапрашиваем.
 */
export function shouldReusePlannerDiagramCache(
  hasCachedScene: boolean,
  seenEpoch: number | null,
  currentEpoch: number
): boolean {
  if (!hasCachedScene) {
    return false;
  }
  return seenEpoch === null || seenEpoch === currentEpoch;
}

/**
 * Пустой кэш после создания карточки не подменяет GET: иначе редактор
 * открывается без сцены, хотя превью уже успело её дорисовать.
 */
export function shouldUseCachedPlannerDiagramEditorScene(
  cached: ExcalidrawCommentScene | null,
  isFreshEditor: boolean
): cached is ExcalidrawCommentScene {
  if (cached == null) {
    return false;
  }
  return isFreshEditor || excalidrawSceneHasDrawableElements(cached);
}

/** Только что созданная пустая схема: редактор не ждёт GET из S3. */
export function markPlannerDiagramEditorFresh(commentId: string): void {
  freshEditorIds.add(commentId);
}

export function takePlannerDiagramEditorFresh(commentId: string): boolean {
  return freshEditorIds.delete(commentId);
}
