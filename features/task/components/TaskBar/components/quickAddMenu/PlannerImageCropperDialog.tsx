'use client';

import type { NormalizedCropRect } from '@/features/task/utils/cropPlannerImage';

import { useCallback, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
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
    <Modal
      busy={applying}
      className="max-w-3xl"
      description={t('sprintPlanner.swimlane.quickAddMenu.cropImageHint')}
      footer={
        <>
          <Button disabled={applying} variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={applying} onClick={() => onApply(crop)}>
            {applying ? <Icon className="h-4 w-4 shrink-0 animate-spin" name="spinner" /> : null}
            {t('sprintPlanner.swimlane.quickAddMenu.cropImageApply')}
          </Button>
        </>
      }
      open={open}
      title={t('sprintPlanner.swimlane.quickAddMenu.cropImageTitle')}
      onClose={() => handleOpenChange(false)}
    >
      {/* Метка открытого окна обрезки: по ней меню быстрого добавления не закрывается кликом в окне. */}
      <div data-planner-image-cropper="">
        <PlannerImageCropperStage
          crop={crop}
          imageUrl={imageUrl}
          moveAriaLabel={t('sprintPlanner.swimlane.quickAddMenu.cropImageMoveAria')}
          resizeAriaLabel={t('sprintPlanner.swimlane.quickAddMenu.cropImageResizeAria')}
          onCropChange={setCrop}
        />
      </div>
    </Modal>
  );
}
