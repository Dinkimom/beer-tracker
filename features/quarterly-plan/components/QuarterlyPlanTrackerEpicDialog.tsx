'use client';

import * as Dialog from '@radix-ui/react-dialog';

import { Button } from '@/components/Button';
import {
  OVERLAY_BACKDROP_ENTER,
  OVERLAY_CENTERED_DIALOG_ANIMATION,
} from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { QuarterlyPlanTrackerEpicSearch } from './QuarterlyPlanTrackerEpicSearch';

interface QuarterlyPlanTrackerEpicDialogProps {
  boardId: number;
  /** Привязываем направление — ищем эпики; иначе эпик плана — ищем любые задачи. */
  direction: boolean;
  /** Ключи, которые уже стоят в плане: второй раз их не добавить. */
  usedIssueKeys: ReadonlySet<string>;
  onClose: () => void;
  onPick: (issueKey: string, title: string) => void;
}

/** Выбор в трекере: задачи — для эпика плана (новой строки или заведённой), эпика — для направления. */
export function QuarterlyPlanTrackerEpicDialog({
  boardId,
  direction,
  usedIssueKeys,
  onClose,
  onPick,
}: QuarterlyPlanTrackerEpicDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <div
          aria-hidden
          className={`fixed inset-0 ${OVERLAY_BACKDROP_ENTER}`}
          style={{ zIndex: ZIndex.modalBackdrop }}
        >
          <Dialog.Overlay className="absolute inset-0 bg-black/50 dark:bg-black/70" />
        </div>
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 flex w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800 ${OVERLAY_CENTERED_DIALOG_ANIMATION}`}
          style={{ zIndex: ZIndex.modal }}
        >
          <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t(direction ? 'quarterlyPlan.link.directionTitle' : 'quarterlyPlan.link.title')}
          </Dialog.Title>
          <Dialog.Description className="-mt-3 text-sm text-ds-text-muted">
            {t(direction ? 'quarterlyPlan.link.directionHint' : 'quarterlyPlan.link.searchHint')}
          </Dialog.Description>
          <QuarterlyPlanTrackerEpicSearch
            boardId={boardId}
            epicsOnly={direction}
            placeholder={t(direction ? 'quarterlyPlan.link.directionPlaceholder' : 'quarterlyPlan.link.searchPlaceholder')}
            usedIssueKeys={usedIssueKeys}
            onPick={onPick}
          />
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
