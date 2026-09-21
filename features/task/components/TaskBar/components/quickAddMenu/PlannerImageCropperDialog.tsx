'use client';

import type { NormalizedCropRect } from '@/features/task/utils/cropPlannerImage';

import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import {
  OVERLAY_BACKDROP_ENTER,
  OVERLAY_CENTERED_DIALOG_ANIMATION,
} from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FULL_NORMALIZED_CROP_RECT } from '@/features/task/utils/cropPlannerImage';

import { PlannerImageCropperStage } from './PlannerImageCropperStage';

interface PlannerImageCropperDialogProps {
  applying?: boolean;
  imageUrl: string;
  open: boolean;
  onApply: (crop: NormalizedCropRect) => void;
  onOpenChange: (open: boolean) => void;
}

export function PlannerImageCropperDialog({
  applying = false,
  imageUrl,
  onApply,
  onOpenChange,
  open,
}: PlannerImageCropperDialogProps) {
  const { t } = useI18n();
  const [crop, setCrop] = useState<NormalizedCropRect>(FULL_NORMALIZED_CROP_RECT);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (applying) {
        return;
      }
      if (nextOpen) {
        setCrop(FULL_NORMALIZED_CROP_RECT);
      }
      onOpenChange(nextOpen);
    },
    [applying, onOpenChange]
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <div
          aria-hidden
          className={`fixed inset-0 ${OVERLAY_BACKDROP_ENTER}`}
          style={{ zIndex: ZIndex.modalBackdrop }}
        >
          <Dialog.Overlay className="absolute inset-0 bg-black/50 dark:bg-black/70" />
        </div>
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 w-[min(100vw-2rem,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800 ${ZIndex.class('modal')} ${OVERLAY_CENTERED_DIALOG_ANIMATION}`}
          data-planner-image-cropper=""
          onEscapeKeyDown={(event) => {
            event.stopPropagation();
            if (applying) {
              event.preventDefault();
            }
          }}
        >
          <Dialog.Title className="mb-1 font-sans text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('sprintPlanner.swimlane.quickAddMenu.cropImageTitle')}
          </Dialog.Title>
          <Dialog.Description className="mb-3 font-sans text-sm text-gray-600 dark:text-gray-400">
            {t('sprintPlanner.swimlane.quickAddMenu.cropImageHint')}
          </Dialog.Description>
          <PlannerImageCropperStage
            crop={crop}
            imageUrl={imageUrl}
            moveAriaLabel={t('sprintPlanner.swimlane.quickAddMenu.cropImageMoveAria')}
            resizeAriaLabel={t('sprintPlanner.swimlane.quickAddMenu.cropImageResizeAria')}
            onCropChange={setCrop}
          />
          <div className="mt-4 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button disabled={applying} type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </Dialog.Close>
            <Button
              disabled={applying}
              type="button"
              variant="primary"
              onClick={() => onApply(crop)}
            >
              {applying ? (
                <>
                  <Icon className="h-4 w-4 shrink-0 animate-spin" name="spinner" />
                  {t('sprintPlanner.swimlane.quickAddMenu.cropImageApply')}
                </>
              ) : (
                t('sprintPlanner.swimlane.quickAddMenu.cropImageApply')
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
