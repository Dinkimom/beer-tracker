'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import { usePlannerRemoteMediaEnabled } from '@/contexts/PlannerRemoteMediaContext';
import { renderExcalidrawScenePreview } from '@/features/comments/utils/renderExcalidrawScenePreview';
import {
  getDiagramCardEmptySlotClass,
  getDiagramCardWellClass,
  resolveAnnotationWellCursorClass,
} from '@/features/task/utils/photoCardSurface';
import { fetchSprintCommentDiagram } from '@/lib/api/sprints';
import { parsePlannerCommentDiagramUrl } from '@/lib/comments/commentKind';
import {
  excalidrawSceneHasDrawableElements,
  parseExcalidrawCommentScene,
  parseExcalidrawSceneJson,
  resolveExcalidrawSceneBackground,
  type ExcalidrawCommentScene,
} from '@/lib/comments/excalidrawCommentPayload';
import {
  getPlannerDiagramRemoteEpoch,
  getPlannerDiagramScene,
  rememberPlannerDiagramScene,
  shouldReusePlannerDiagramCache,
  subscribePlannerDiagramPreview,
} from '@/lib/comments/plannerDiagramPreviewStore';

interface TaskCardSwimlaneDiagramPreviewProps {
  alt: string;
  isDragging?: boolean;
  isResizing?: boolean;
  sceneText?: string;
  sceneUrl?: string;
}

function parseLocalScene(sceneText: string | undefined): ExcalidrawCommentScene | null {
  if (!sceneText) {
    return null;
  }
  return parseExcalidrawSceneJson(sceneText) ?? parseExcalidrawCommentScene(sceneText);
}

export function TaskCardSwimlaneDiagramPreview({
  alt,
  isDragging = false,
  isResizing = false,
  sceneUrl,
  sceneText,
}: TaskCardSwimlaneDiagramPreviewProps) {
  const loadRemoteMedia = usePlannerRemoteMediaEnabled();
  const commentId = sceneUrl ? parsePlannerCommentDiagramUrl(sceneUrl)?.commentId : undefined;
  const cachedScene = useSyncExternalStore(
    subscribePlannerDiagramPreview,
    () => (commentId ? getPlannerDiagramScene(commentId) : null),
    () => null
  );
  const remoteEpoch = useSyncExternalStore(
    subscribePlannerDiagramPreview,
    getPlannerDiagramRemoteEpoch,
    () => 0
  );
  const seenEpochRef = useRef<number | null>(null);
  const [remoteScene, setRemoteScene] = useState<ExcalidrawCommentScene | null>(null);
  const localScene = useMemo(() => parseLocalScene(sceneText), [sceneText]);
  const scene = cachedScene ?? remoteScene ?? localScene;
  const hasDrawable = scene != null && excalidrawSceneHasDrawableElements(scene);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const displayUrl = hasDrawable ? previewUrl : null;

  useEffect(() => {
    if (!loadRemoteMedia) {
      return;
    }
    const parsed = sceneUrl ? parsePlannerCommentDiagramUrl(sceneUrl) : null;
    if (!parsed) {
      return;
    }
    const hasCachedScene = getPlannerDiagramScene(parsed.commentId) != null;
    if (shouldReusePlannerDiagramCache(hasCachedScene, seenEpochRef.current, remoteEpoch)) {
      seenEpochRef.current = remoteEpoch;
      return;
    }
    let cancelled = false;
    fetchSprintCommentDiagram(parsed.sprintId, parsed.commentId)
      .then((fetched) => {
        if (!cancelled && fetched) {
          rememberPlannerDiagramScene(parsed.commentId, fetched);
          setRemoteScene(fetched);
          seenEpochRef.current = remoteEpoch;
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadRemoteMedia, remoteEpoch, sceneUrl]);

  useEffect(() => {
    if (!hasDrawable || !scene) {
      return;
    }
    if (!loadRemoteMedia && !sceneText) {
      return;
    }
    let cancelled = false;
    renderExcalidrawScenePreview(scene)
      .then((url) => {
        if (!cancelled && url) {
          setPreviewUrl(url);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasDrawable, loadRemoteMedia, scene, sceneText]);

  let wellBody: ReactNode = null;
  if (displayUrl) {
    wellBody = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        className="h-full w-full object-contain"
        decoding="async"
        loading="lazy"
        src={displayUrl}
      />
    );
  } else if (!hasDrawable) {
    wellBody = (
      <div aria-hidden className={getDiagramCardEmptySlotClass()}>
        <Icon className="h-7 w-7" name="file" />
      </div>
    );
  }

  return (
    <div
      className={`${getDiagramCardWellClass()}${resolveAnnotationWellCursorClass({
        isDragging,
        isResizing,
        showZoomCursor: true,
      })}`}
      style={{ backgroundColor: resolveExcalidrawSceneBackground(scene) }}
    >
      {wellBody}
    </div>
  );
}
