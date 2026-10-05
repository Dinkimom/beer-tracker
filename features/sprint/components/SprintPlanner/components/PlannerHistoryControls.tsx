'use client';

import { observer } from 'mobx-react-lite';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_TOOLBAR_ITEM_IDLE } from '@/features/context-menu/contextMenuClasses';
import { useRootStore } from '@/lib/layers';

import { formatPlannerHistoryShortcutHint } from './plannerHistoryKeyboard';
import {
  formatPlannerShortcutAria,
  PlannerShortcutTooltip,
} from './PlannerShortcutTooltip';
import { usePlannerHistoryKeyboardShortcuts } from './usePlannerHistoryKeyboardShortcuts';

interface PlannerHistoryControlsProps {
  canRedo: boolean;
  canUndo: boolean;
  className?: string;
  onRedo: () => void;
  onUndo: () => void;
}

export const PlannerHistoryControls = observer(function PlannerHistoryControls({
  canRedo,
  canUndo,
  className = '',
  onRedo,
  onUndo,
}: PlannerHistoryControlsProps) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const keyboardEnabled = sprintPlannerUi.diagramEditorTaskId == null;
  const undoLabel = t('sprintPlanner.controls.undoPlanChange');
  const redoLabel = t('sprintPlanner.controls.redoPlanChange');
  const undoShortcut = formatPlannerHistoryShortcutHint('undo');
  const redoShortcut = formatPlannerHistoryShortcutHint('redo');

  usePlannerHistoryKeyboardShortcuts(keyboardEnabled);

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border border-gray-200/70 bg-transparent p-1 dark:border-gray-600/70 ${className}`}
    >
      <PlannerShortcutTooltip label={undoLabel} shortcut={undoShortcut} side="bottom">
        <span className="inline-flex">
          <Button
            aria-label={formatPlannerShortcutAria(undoLabel, undoShortcut)}
            className={`!min-h-0 !px-2 !py-1.5 hover:!text-gray-900 dark:hover:!text-white ${FLOATING_TOOLBAR_ITEM_IDLE}`}
            disabled={!canUndo}
            type="button"
            variant="ghost"
            onClick={onUndo}
          >
            <Icon className="h-4 w-4" name="undo" />
          </Button>
        </span>
      </PlannerShortcutTooltip>
      <PlannerShortcutTooltip label={redoLabel} shortcut={redoShortcut} side="bottom">
        <span className="inline-flex">
          <Button
            aria-label={formatPlannerShortcutAria(redoLabel, redoShortcut)}
            className={`!min-h-0 !px-2 !py-1.5 hover:!text-gray-900 dark:hover:!text-white ${FLOATING_TOOLBAR_ITEM_IDLE}`}
            disabled={!canRedo}
            type="button"
            variant="ghost"
            onClick={onRedo}
          >
            <Icon className="h-4 w-4" name="redo" />
          </Button>
        </span>
      </PlannerShortcutTooltip>
    </div>
  );
});
