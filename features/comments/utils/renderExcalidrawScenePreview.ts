import {
  type ExcalidrawCommentScene,
  excalidrawSceneHasDrawableElements,
  listDrawableExcalidrawElements,
  resolveExcalidrawSceneBackground,
} from '@/lib/comments/excalidrawCommentPayload';

const PREVIEW_MAX_EDGE_PX = 360;
const PREVIEW_PADDING_PX = 16;

/** PNG data URL превью сцены, либо null если рисовать нечего. */
export async function renderExcalidrawScenePreview(
  scene: ExcalidrawCommentScene
): Promise<string | null> {
  if (!excalidrawSceneHasDrawableElements(scene)) {
    return null;
  }
  const { exportToCanvas } = await import('@excalidraw/excalidraw');
  const canvas = await exportToCanvas({
    appState: {
      exportBackground: true,
      viewBackgroundColor: resolveExcalidrawSceneBackground(scene),
    },
    elements: listDrawableExcalidrawElements(scene) as never,
    exportPadding: PREVIEW_PADDING_PX,
    files: (scene.files ?? null) as never,
    maxWidthOrHeight: PREVIEW_MAX_EDGE_PX,
  });
  return canvas.toDataURL('image/png');
}
