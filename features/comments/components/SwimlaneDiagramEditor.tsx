'use client';

import type { ExcalidrawCommentScene } from '@/lib/comments/excalidrawCommentPayload';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { isDiagramEditorDirty } from '@/lib/comments/diagramEditorDirty';
import {
  EXCALIDRAW_SCENE_MAX_BYTES,
  serializeExcalidrawScene,
} from '@/lib/comments/excalidrawCommentPayload';

const SwimlaneDiagramCanvas = dynamic(
  () => import('./SwimlaneDiagramCanvas').then((mod) => mod.SwimlaneDiagramCanvas),
  { ssr: false }
);

interface SwimlaneDiagramEditorProps {
  initialScene: ExcalidrawCommentScene;
  onClose: () => void;
  onSave: (scene: ExcalidrawCommentScene) => void;
}

export function SwimlaneDiagramEditor({
  initialScene,
  onClose,
  onSave,
}: SwimlaneDiagramEditorProps) {
  const { t } = useI18n();
  const [getScene, setGetScene] = useState<(() => ExcalidrawCommentScene) | null>(null);
  const [nameDraft, setNameDraft] = useState(initialScene.name?.trim() ?? '');
  const [canvasRevision, setCanvasRevision] = useState<string | null>(null);
  const [savedCanvasRevision, setSavedCanvasRevision] = useState<string | null>(null);
  const latestCanvasRevisionRef = useRef<string | null>(null);
  const canvasBaselineReadyRef = useRef(false);
  const namePlaceholder = t('sprintPlanner.swimlane.quickAddMenu.diagramNamePlaceholder');
  const canSave = isDiagramEditorDirty({
    canvasRevision,
    initialName: initialScene.name,
    nameDraft,
    savedCanvasRevision,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleApiReady = useCallback((readScene: () => ExcalidrawCommentScene) => {
    setGetScene(() => readScene);
  }, []);

  const handleContentRevision = useCallback((revision: string) => {
    latestCanvasRevisionRef.current = revision;
    if (!canvasBaselineReadyRef.current) {
      return;
    }
    setSavedCanvasRevision((saved) => saved ?? revision);
    setCanvasRevision((current) => (current === revision ? current : revision));
  }, []);

  useEffect(() => {
    // Excalidraw шлёт onChange на загрузке и подгонке камеры. База — сцена после этого.
    const timeoutId = window.setTimeout(() => {
      canvasBaselineReadyRef.current = true;
      const revision = latestCanvasRevisionRef.current;
      if (revision == null) {
        return;
      }
      setSavedCanvasRevision(revision);
      setCanvasRevision(revision);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSave = () => {
    if (!canSave) {
      return;
    }
    const scene = {
      ...(getScene?.() ?? initialScene),
      name: nameDraft,
    };
    const serialized = serializeExcalidrawScene(scene);
    if (new TextEncoder().encode(serialized).length > EXCALIDRAW_SCENE_MAX_BYTES) {
      toast.error(t('sprintPlanner.swimlane.quickAddMenu.diagramTooLarge'));
      return;
    }
    onSave(scene);
  };

  return createPortal(
    <div
      aria-label={t('sprintPlanner.swimlane.quickAddMenu.diagramEditorTitle')}
      className={`fixed inset-0 flex flex-col bg-black/70 p-4 ${ZIndex.class('modalBackdrop')}`}
      role="dialog"
      onClick={onClose}
    >
      <div
        className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900 ${ZIndex.class('modal')}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
          <input
            aria-label={namePlaceholder}
            className="min-w-0 flex-1 bg-transparent font-sans text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder={namePlaceholder}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSave();
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              className="!h-8 !min-h-0 !rounded-lg !px-3 !py-0"
              disabled={!canSave}
              type="button"
              variant="primary"
              onClick={handleSave}
            >
              {t('sprintPlanner.swimlane.quickAddMenu.diagramEditorSave')}
            </Button>
            <Button
              aria-label={t('sprintPlanner.swimlane.quickAddMenu.diagramEditorClose')}
              className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-lg !p-0"
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              <Icon className="h-4 w-4" name="close" size="sm" />
            </Button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          <SwimlaneDiagramCanvas
            initialScene={initialScene}
            onApiReady={handleApiReady}
            onContentRevision={handleContentRevision}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
