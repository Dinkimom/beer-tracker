'use client';

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
} from '@/features/context-menu/contextMenuClasses';
import { useRootStore } from '@/lib/layers';

const ACTION_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !gap-1.5 !rounded-md !px-2 !py-0 text-xs font-medium`;

export const SwimlanePlanDraftToolbar = observer(function SwimlanePlanDraftToolbar() {
  const { t } = useI18n();
  const { taskPositions } = useRootStore();
  const [saving, setSaving] = useState(false);
  if (taskPositions.planDraftCount === 0) {
    return null;
  }

  return (
    <div
      aria-label={t('sprintPlanner.swimlane.planDraft.aria')}
      className={`pointer-events-auto flex items-center gap-0.5 px-1 py-1 ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      data-plan-draft-toolbar=""
      role="toolbar"
    >
      <span
        className={`${CONTEXT_MENU_GHOST_BUTTON_RESET} inline-flex h-6 items-center gap-1.5 px-2 text-xs font-medium text-gray-700 dark:text-gray-300`}
      >
        <Icon className="h-3.5 w-3.5" name="sparkles" />
        {t('sprintPlanner.swimlane.planDraft.label')}
      </span>
      <Button
        aria-label={t('sprintPlanner.swimlane.planDraft.save')}
        className={`${ACTION_CLASS} text-green-700 hover:!bg-green-500/[0.12] dark:text-green-400 dark:hover:!bg-green-400/[0.12]`}
        disabled={saving}
        type="button"
        variant="ghost"
        onClick={() => {
          setSaving(true);
          taskPositions
            .commitPlanDraft()
            .then((result) => {
              if (result.ok) {
                toast.success(t('sprintPlanner.swimlane.planDraft.saved'));
                return;
              }
              toast.error(t('sprintPlanner.swimlane.planDraft.saveFailed'));
            })
            .finally(() => setSaving(false));
        }}
      >
        <Icon className="h-3.5 w-3.5" name="check" />
        <span>{t('sprintPlanner.swimlane.planDraft.save')}</span>
      </Button>
      <Button
        aria-label={t('sprintPlanner.swimlane.planDraft.cancel')}
        className={`${ACTION_CLASS} text-red-600 hover:!bg-red-500/[0.1] dark:text-red-400 dark:hover:!bg-red-400/[0.1]`}
        disabled={saving}
        type="button"
        variant="ghost"
        onClick={() => taskPositions.discardPlanDraft()}
      >
        <Icon className="h-3.5 w-3.5" name="x" />
        <span>{t('sprintPlanner.swimlane.planDraft.cancel')}</span>
      </Button>
    </div>
  );
});
