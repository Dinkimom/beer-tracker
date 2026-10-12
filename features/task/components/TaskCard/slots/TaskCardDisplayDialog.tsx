'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useCommitSwimlaneCardSlotLayout } from '@/hooks/useLocalStorage';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { fetchPlannerTrackerFields } from '@/lib/api/plannerTrackerFields';
import { defaultTaskCardSlotLayout, taskCardSlotLayoutsEqual } from '@/lib/taskCard/taskCardSlots';

import { TaskCardDisplaySettingsPanel } from './TaskCardDisplaySettingsPanel';

interface TaskCardDisplayDialogProps {
  nested?: boolean;
  open: boolean;
  onClose: () => void;
}

export function TaskCardDisplayDialog({ nested = false, onClose, open }: TaskCardDisplayDialogProps) {
  const { t } = useI18n();
  const { commit, layout } = useCommitSwimlaneCardSlotLayout();
  const { activeOrganizationId, sessionLoading } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const fieldsQuery = useQuery({
    enabled: open && Boolean(activeOrganizationId),
    queryFn: () => fetchPlannerTrackerFields(activeOrganizationId ?? ''),
    queryKey: ['planner-tracker-fields', activeOrganizationId],
    staleTime: 5 * 60 * 1000,
  });
  const overlay = useOverlayPresence(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!overlay.mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 flex cursor-pointer items-center justify-center bg-black/40 dark:bg-black/60 ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: nested ? ZIndex.modalNestedBackdrop : ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={onClose}
    >
      <div
        aria-labelledby="task-card-display-title"
        aria-modal="true"
        className={`mx-4 flex max-h-[90vh] w-full max-w-6xl cursor-default flex-col overflow-hidden rounded-lg border border-ds-border-subtle bg-white shadow-xl dark:bg-gray-800 ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        role="dialog"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-3 px-5 pb-1 pt-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100" id="task-card-display-title">
            {t('settings.planningTab.cardSlots.dialogTitle')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              disabled={taskCardSlotLayoutsEqual(layout, defaultTaskCardSlotLayout())}
              title={t('settings.planningTab.cardSlots.resetHint')}
              variant="secondary"
              onClick={() => {
                commit(defaultTaskCardSlotLayout());
              }}
            >
              {t('settings.planningTab.cardSlots.reset')}
            </Button>
            <HeaderIconButton aria-label={t('common.close')} type="button" onClick={onClose}>
              <Icon className="h-5 w-5" name="close" />
            </HeaderIconButton>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <TaskCardDisplaySettingsPanel
            fields={fieldsQuery.data ?? []}
            fieldsStatus={trackerFieldsStatus(
              activeOrganizationId,
              fieldsQuery.isError,
              fieldsQuery.isLoading || sessionLoading
            )}
            layout={layout}
            organizationId={activeOrganizationId}
            onChange={commit}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

function trackerFieldsStatus(
  organizationId: string | null,
  isError: boolean,
  isLoading: boolean
): 'loading' | 'ready' | 'unavailable' {
  if (isLoading) {
    return 'loading';
  }
  if (!organizationId || isError) {
    return 'unavailable';
  }
  return 'ready';
}
