'use client';

import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import { usePlannerRemoteMediaEnabled } from '@/contexts/PlannerRemoteMediaContext';
import {
  getPhotoCardCaptionClass,
  getPhotoCardEmptySlotClass,
  getPhotoCardWellClass,
  resolveAnnotationWellCursorClass,
} from '@/features/task/utils/photoCardSurface';
import { resolveDeferredPlannerMediaUrl } from '@/features/task/utils/plannerRemoteMedia';

import { PhotoCardImage } from './PhotoCardImage';
import { useTaskCardSwimlaneImageDraft } from './TaskCardSwimlaneImageDraftContext';
import { TaskCardSwimlaneImageDraftEditor } from './TaskCardSwimlaneImageDraftEditor';

interface TaskCardSwimlaneImageContentProps {
  caption?: string;
  emptyLabel: string;
  imageUrl?: string;
  isDragging?: boolean;
  isResizing?: boolean;
  /** Lightbox доступен — только для cursor-zoom-in; открытие по клику на карточке. */
  onPhotoClick?: () => void;
}

function renderPhotoCardWellBody(params: {
  displayUrl?: string;
  emptyLabel: string;
  imageUrl?: string;
}): ReactNode {
  if (params.displayUrl) {
    return <PhotoCardImage className="pointer-events-none" lazy src={params.displayUrl} />;
  }
  if (params.imageUrl) {
    return null;
  }
  return (
    <div className={getPhotoCardEmptySlotClass()}>
      <Icon className="h-5 w-5" name="image" />
      <span>{params.emptyLabel}</span>
    </div>
  );
}

export function TaskCardSwimlaneImageContent({
  caption,
  emptyLabel,
  imageUrl,
  isDragging = false,
  isResizing = false,
  onPhotoClick,
}: TaskCardSwimlaneImageContentProps) {
  const imageDraft = useTaskCardSwimlaneImageDraft();
  const loadRemoteMedia = usePlannerRemoteMediaEnabled();
  if (imageDraft) {
    return <TaskCardSwimlaneImageDraftEditor draft={imageDraft} />;
  }
  const displayUrl = resolveDeferredPlannerMediaUrl(imageUrl, loadRemoteMedia);
  const showZoomCursor = Boolean(displayUrl && onPhotoClick);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className={`${getPhotoCardWellClass()}${resolveAnnotationWellCursorClass({
          isDragging,
          isResizing,
          showZoomCursor,
        })}`}
      >
        {renderPhotoCardWellBody({ displayUrl, emptyLabel, imageUrl })}
      </div>
      {caption ? <span className={getPhotoCardCaptionClass()}>{caption}</span> : null}
    </div>
  );
}
