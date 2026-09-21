'use client';

import { observer } from 'mobx-react-lite';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
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
      className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/90 ${className}`}
    >
      <PlannerShortcutTooltip label={undoLabel} shortcut={undoShortcut} side="bottom">
        <span className="inline-flex">
          <Button
            aria-label={formatPlannerShortcutAria(undoLabel, undoShortcut)}
            className="!min-h-0 !px-2 !py-1.5 text-gray-600 hover:!text-gray-900 dark:text-gray-300 dark:hover:!text-white"
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
            className="!min-h-0 !px-2 !py-1.5 text-gray-600 hover:!text-gray-900 dark:text-gray-300 dark:hover:!text-white"
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
