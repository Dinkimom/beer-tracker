'use client';

import type { TaskCardSwimlaneImageDraft } from './TaskCardSwimlaneImageDraftContext';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';

import { useId, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { PlannerImageCropperDialog } from '@/features/task/components/TaskBar/components/quickAddMenu/PlannerImageCropperDialog';
import { isQuickAddSubmitKey } from '@/features/task/components/TaskBar/components/quickAddMenu/quickAddMenuKeyboard';
import { usePlannerImageDraftFile } from '@/features/task/components/TaskBar/components/quickAddMenu/usePlannerImageDraftFile';
import {
  getPhotoCardCaptionClass,
  getPhotoCardEmptySlotClass,
  getPhotoCardWellClass,
} from '@/features/task/utils/photoCardSurface';

const CROP_BUTTON_CLASS =
  'absolute left-1 top-1 z-10 !h-6 !w-6 !min-h-0 !min-w-0 !justify-center !rounded-md !border-0 !bg-white/90 !p-0 text-gray-700 shadow-sm hover:!bg-white dark:!bg-gray-800/90 dark:text-gray-200';

interface TaskCardSwimlaneImageDraftEditorProps {
  draft: TaskCardSwimlaneImageDraft;
}

export function TaskCardSwimlaneImageDraftEditor({
  draft,
}: TaskCardSwimlaneImageDraftEditorProps) {
  const { t } = useI18n();
  const fileInputId = useId();
  const [isDragOver, setIsDragOver] = useState(false);
  const {
    canCropImage,
    cropSource,
    isCropping,
    applyFile,
    handleCropApply,
    handleCropCurrent,
    revokeCropSource,
  } = usePlannerImageDraftFile({
    imageUrl: draft.imageUrl,
    isSubmitting: draft.isSubmitting,
    listenToWindowPaste: true,
    onImageUrlChange: draft.onImageUrlChange,
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    applyFile(event.dataTransfer.files[0] ?? null);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      draft.onCancel();
      return;
    }
    if (isQuickAddSubmitKey(event, true) && draft.imageUrl?.trim()) {
      event.preventDefault();
      draft.onSubmit();
    }
  };

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col"
      data-swimlane-image-draft=""
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="relative flex min-h-0 flex-1 flex-col bg-black">
        <label
          className={`${getPhotoCardWellClass()} h-full ${
            isDragOver ? 'ring-2 ring-inset ring-blue-400' : ''
          } cursor-pointer`}
          htmlFor={fileInputId}
          onDragLeave={() => setIsDragOver(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDrop={handleDrop}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {draft.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-contain" src={draft.imageUrl} />
          ) : (
            <div className={getPhotoCardEmptySlotClass()}>
              <span className="flex flex-col items-center gap-1 px-1">
                <Icon className="h-5 w-5 text-white/80" name="image" />
                <span>{t('sprintPlanner.swimlane.quickAddMenu.imageDropHint')}</span>
              </span>
            </div>
          )}
        </label>
        {draft.imageUrl && canCropImage ? (
          <Button
            aria-label={t('sprintPlanner.swimlane.quickAddMenu.cropImageAria')}
            className={CROP_BUTTON_CLASS}
            disabled={draft.isSubmitting || isCropping}
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleCropCurrent();
            }}
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon className="h-3.5 w-3.5" name="edit" />
          </Button>
        ) : null}
      </div>
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={draft.isSubmitting}
        id={fileInputId}
        type="file"
        onChange={handleFileChange}
      />
      <input
        aria-label={t('sprintPlanner.swimlane.quickAddMenu.imageCaptionPlaceholder')}
        className={`${getPhotoCardCaptionClass()} relative z-[31] bg-transparent outline-none placeholder:text-current placeholder:opacity-70`}
        disabled={draft.isSubmitting}
        placeholder={t('sprintPlanner.swimlane.quickAddMenu.imageCaptionPlaceholder')}
        spellCheck={false}
        value={draft.caption}
        onChange={(event) => draft.onCaptionChange(event.target.value)}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      />
      {cropSource ? (
        <PlannerImageCropperDialog
          applying={isCropping}
          imageUrl={cropSource.url}
          open
          onApply={handleCropApply}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !isCropping) {
              revokeCropSource();
            }
          }}
        />
      ) : null}
    </div>
  );
}
