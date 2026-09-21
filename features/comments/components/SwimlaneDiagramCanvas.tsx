'use client';

import type { ExcalidrawCommentScene } from '@/lib/comments/excalidrawCommentPayload';

import { Excalidraw } from '@excalidraw/excalidraw';
import { useCallback, useRef } from 'react';

import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import {
  excalidrawSceneHasDrawableElements,
  resolveExcalidrawSceneBackground,
} from '@/lib/comments/excalidrawCommentPayload';

import '@excalidraw/excalidraw/index.css';

interface SwimlaneDiagramCanvasProps {
  initialScene: ExcalidrawCommentScene;
  onApiReady: (getScene: () => ExcalidrawCommentScene) => void;
}

interface ExcalidrawSceneApi {
  getAppState: () => { viewBackgroundColor: string };
  getFiles: () => Record<string, unknown>;
  getSceneElements: () => readonly unknown[];
  onChange?: (callback: (elements: readonly unknown[]) => void) => () => void;
  refresh: () => void;
  scrollToContent: (
    target?: readonly unknown[],
    opts?: { fitToViewport?: boolean; viewportZoomFactor?: number }
  ) => void;
}

function readSceneFromApi(
  api: ExcalidrawSceneApi,
  initialScene: ExcalidrawCommentScene
): ExcalidrawCommentScene {
  const files = api.getFiles();
  return {
    v: 1,
    elements: [...api.getSceneElements()],
    ...(typeof initialScene.name === 'string' && initialScene.name.trim()
      ? { name: initialScene.name.trim() }
      : {}),
    appState: {
      viewBackgroundColor: api.getAppState().viewBackgroundColor,
    },
    ...(Object.keys(files).length > 0 ? { files } : {}),
  };
}

/** Камера после layout: initialData.scrollToContent считает viewport, пока контейнер ещё 0×0. */
function scheduleFitToLoadedScene(api: ExcalidrawSceneApi, scene: ExcalidrawCommentScene): void {
  if (!excalidrawSceneHasDrawableElements(scene)) {
    return;
  }
  let done = false;
  const lifetime: { unsubscribe: () => void } = { unsubscribe: () => undefined };
  const fit = () => {
    if (done || api.getSceneElements().length === 0) {
      return;
    }
    done = true;
    lifetime.unsubscribe();
    api.refresh();
    api.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.85 });
  };
  lifetime.unsubscribe = api.onChange?.(fit) ?? lifetime.unsubscribe;
  requestAnimationFrame(() => {
    requestAnimationFrame(fit);
  });
}

export function SwimlaneDiagramCanvas({ initialScene, onApiReady }: SwimlaneDiagramCanvasProps) {
  const isDark = useDocumentDarkClass();
  const apiRef = useRef<ExcalidrawSceneApi | null>(null);

  const handleApi = useCallback(
    (api: ExcalidrawSceneApi) => {
      apiRef.current = api;
      scheduleFitToLoadedScene(api, initialScene);
      onApiReady(() => {
        const current = apiRef.current;
        if (!current) {
          return initialScene;
        }
        return readSceneFromApi(current, initialScene);
      });
    },
    [initialScene, onApiReady]
  );

  return (
    <div className="absolute inset-0 min-h-0 min-w-0">
      <Excalidraw
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
        excalidrawAPI={handleApi as never}
        initialData={{
          elements: initialScene.elements as never,
          appState: {
            viewBackgroundColor: resolveExcalidrawSceneBackground(initialScene),
          },
          files: (initialScene.files ?? {}) as never,
          scrollToContent: true,
        }}
        theme={isDark ? 'dark' : 'light'}
      />
    </div>
  );
}
