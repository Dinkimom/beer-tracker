'use client';

import type { QuarterlySprintInfo } from '../../types';
import type { QuarterlyDevelopmentPlanParentKind } from '../../utils/quarterlyDevelopmentPlanRow';

import * as Dialog from '@radix-ui/react-dialog';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import {
  OVERLAY_BACKDROP_ENTER,
  OVERLAY_CENTERED_DIALOG_ANIMATION,
} from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  useEpicOccupancyRowFieldsStorage,
  useEpicOccupancyTimelineSettingsStorage,
} from '@/hooks/useLocalStorage';

import { useStoryDevelopmentPlanOccupancyData } from '../../hooks/useStoryDevelopmentPlanOccupancyData';

import { QuarterlyStoryDevelopmentPlanModalBody } from './QuarterlyStoryDevelopmentPlanModalBody';
import { QuarterlyTaskTitleLink } from './QuarterlyTaskTitleLink';

interface QuarterlyStoryDevelopmentPlanModalProps {
  boardId: number;
  open: boolean;
  parentKey: string | null;
  parentKind: QuarterlyDevelopmentPlanParentKind | null;
  parentName: string;
  sprintInfos: QuarterlySprintInfo[];
  onOpenChange: (open: boolean) => void;
}

export function QuarterlyStoryDevelopmentPlanModal({
  boardId,
  open,
  onOpenChange,
  parentKey,
  parentKind,
  parentName,
  sprintInfos,
}: QuarterlyStoryDevelopmentPlanModalProps) {
  const { t } = useI18n();
  const [timelineSettings] = useEpicOccupancyTimelineSettingsStorage();
  const [rowFieldsVisibility] = useEpicOccupancyRowFieldsStorage();

  const { data, isLoading, isError } = useStoryDevelopmentPlanOccupancyData({
    boardId,
    parentKey,
    parentKind,
    parentName,
    sprintInfos,
    enabled: open,
  });

  const parentTaskType = parentKind === 'epic' ? 'epic' : 'story';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <Dialog.Overlay
          className={`fixed inset-0 bg-black/50 dark:bg-black/70 ${OVERLAY_BACKDROP_ENTER}`}
          style={{ zIndex: ZIndex.modalBackdrop }}
        />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 flex w-[min(96vw,1400px)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${OVERLAY_CENTERED_DIALOG_ANIMATION}`}
          style={{ zIndex: ZIndex.modal }}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <Dialog.Title className="min-w-0 flex-1 text-base font-semibold text-gray-900 dark:text-gray-100">
              {parentKey != null ? (
                <QuarterlyTaskTitleLink
                  displayKey={parentKey}
                  taskName={parentName || parentKey}
                  taskType={parentTaskType}
                />
              ) : null}
            </Dialog.Title>
            <Dialog.Close asChild>
              <HeaderIconButton aria-label={t('common.close')} title={t('common.close')}>
                <Icon className="h-4 w-4" name="close" />
              </HeaderIconButton>
            </Dialog.Close>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col"
            style={{ minHeight: '60vh' }}
          >
            <QuarterlyStoryDevelopmentPlanModalBody
              data={data}
              isError={isError}
              isLoading={isLoading}
              rowFieldsVisibility={rowFieldsVisibility}
              timelineSettings={timelineSettings}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
