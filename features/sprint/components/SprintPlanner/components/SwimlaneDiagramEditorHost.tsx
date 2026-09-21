'use client';

import type { Comment } from '@/types';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { SwimlaneDiagramEditor } from '@/features/comments/components/SwimlaneDiagramEditor';
import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { fetchSprintCommentDiagram, saveSprintCommentDiagram } from '@/lib/api/sprints';
import { parsePlannerCommentDiagramUrl } from '@/lib/comments/commentKind';
import {
  emptyExcalidrawCommentScene,
  parseExcalidrawCommentScene,
  parseExcalidrawSceneJson,
  trimExcalidrawSceneName,
  type ExcalidrawCommentScene,
} from '@/lib/comments/excalidrawCommentPayload';
import {
  getPlannerDiagramScene,
  rememberPlannerDiagramScene,
  shouldUseCachedPlannerDiagramEditorScene,
  takePlannerDiagramEditorFresh,
} from '@/lib/comments/plannerDiagramPreviewStore';
import { useRootStore } from '@/lib/layers';

import { SwimlaneDiagramEditorPending } from './SwimlaneDiagramEditorPending';

interface SwimlaneDiagramEditorHostProps {
  comments: Comment[];
  selectedSprintId: number | null;
  onCommentUpdate?: (commentId: string, text: string) => void;
}

function localSceneFromComment(comment: Comment): ExcalidrawCommentScene {
  const fromText =
    parseExcalidrawSceneJson(comment.text) ?? parseExcalidrawCommentScene(comment.text);
  if (fromText) {
    return fromText;
  }
  const name = trimExcalidrawSceneName(comment.text);
  return {
    ...emptyExcalidrawCommentScene(),
    ...(name ? { name } : {}),
  };
}

function resolveImmediateEditorScene(
  commentId: string,
  comment: Comment | undefined
): ExcalidrawCommentScene | null {
  const cached = getPlannerDiagramScene(commentId);
  if (shouldUseCachedPlannerDiagramEditorScene(cached, false)) {
    return cached;
  }
  if (!takePlannerDiagramEditorFresh(commentId)) {
    return null;
  }
  return cached ?? (comment ? localSceneFromComment(comment) : null);
}

export const SwimlaneDiagramEditorHost = observer(function SwimlaneDiagramEditorHost({
  comments,
  selectedSprintId,
  onCommentUpdate,
}: SwimlaneDiagramEditorHostProps) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const taskId = sprintPlannerUi.diagramEditorTaskId;
  const commentId = taskId ? parseSwimlaneCommentTaskId(taskId) : null;
  const comment = commentId ? comments.find((item) => item.id === commentId) : undefined;
  const [scene, setScene] = useState<ExcalidrawCommentScene | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const openedCommentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!commentId) {
      openedCommentIdRef.current = null;
      setScene(null);
      setSceneReady(false);
      return;
    }
    if (openedCommentIdRef.current === commentId) {
      return;
    }
    const immediate = resolveImmediateEditorScene(commentId, comment);
    if (immediate) {
      openedCommentIdRef.current = commentId;
      setScene(immediate);
      setSceneReady(true);
      return;
    }
    if (!comment) {
      setScene(null);
      setSceneReady(false);
      return;
    }
    const parsedUrl = parsePlannerCommentDiagramUrl(comment.diagramUrl);
    const sprintId = parsedUrl?.sprintId ?? selectedSprintId;
    if (comment.kind === 'diagram' && sprintId != null && parsedUrl) {
      let cancelled = false;
      setSceneReady(false);
      fetchSprintCommentDiagram(sprintId, commentId)
        .then((fetched) => {
          if (!cancelled) {
            if (fetched) {
              rememberPlannerDiagramScene(commentId, fetched);
            }
            openedCommentIdRef.current = commentId;
            setScene(fetched ?? localSceneFromComment(comment));
            setSceneReady(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            openedCommentIdRef.current = commentId;
            setScene(localSceneFromComment(comment));
            setSceneReady(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }
    openedCommentIdRef.current = commentId;
    setScene(localSceneFromComment(comment));
    setSceneReady(true);
    return undefined;
  }, [comment, commentId, selectedSprintId]);

  if (!taskId) {
    return null;
  }

  if (!commentId || !sceneReady || !scene) {
    const pendingName =
      comment?.text.trim() ||
      (commentId ? getPlannerDiagramScene(commentId)?.name?.trim() : undefined) ||
      undefined;
    return (
      <SwimlaneDiagramEditorPending
        closeLabel={t('sprintPlanner.swimlane.quickAddMenu.diagramEditorClose')}
        name={pendingName}
        title={t('sprintPlanner.swimlane.quickAddMenu.diagramEditorTitle')}
        onClose={sprintPlannerUi.closeDiagramEditor}
      />
    );
  }

  const parsedUrl = comment ? parsePlannerCommentDiagramUrl(comment.diagramUrl) : null;
  const sprintId = parsedUrl?.sprintId ?? selectedSprintId;

  return (
    <SwimlaneDiagramEditor
      key={`${commentId}:${scene.name ?? ''}`}
      initialScene={scene}
      onClose={sprintPlannerUi.closeDiagramEditor}
      onSave={(nextScene) => {
        persistScene({
          commentId,
          failedMessage: t('sprintPlanner.swimlane.quickAddMenu.createDiagramFailed'),
          onCommentUpdate,
          scene: nextScene,
          sprintId,
        });
        sprintPlannerUi.closeDiagramEditor();
      }}
    />
  );
});

function persistScene(input: {
  commentId: string;
  failedMessage: string;
  onCommentUpdate?: (commentId: string, text: string) => void;
  scene: ExcalidrawCommentScene;
  sprintId: number | null;
}): void {
  rememberPlannerDiagramScene(input.commentId, input.scene);
  input.onCommentUpdate?.(input.commentId, trimExcalidrawSceneName(input.scene.name) ?? '');
  if (input.sprintId == null) {
    return;
  }
  saveSprintCommentDiagram(input.sprintId, input.commentId, input.scene)
    .then((saved) => {
      if (!saved) {
        toast.error(input.failedMessage);
      }
    })
    .catch(() => undefined);
}
