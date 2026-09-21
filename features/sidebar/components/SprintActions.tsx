/**
 * Sprint start / finish actions in the sidebar.
 */

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface SprintActionsProps {
  allChecksPassed: boolean;
  canFinishSprint: boolean;
  canStartSprint: boolean;
  isChangingStatus: boolean;
  onFinishSprint: () => void;
  onStartSprint: () => void;
}

export function SprintActions({
  allChecksPassed,
  canFinishSprint,
  canStartSprint,
  isChangingStatus,
  onFinishSprint,
  onStartSprint,
}: SprintActionsProps) {
  const { t } = useI18n();
  if (!canStartSprint && !canFinishSprint) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 pt-3 pb-3 flex-shrink-0 space-y-2">
      {canStartSprint && (
        <>
          <Button
            className="w-full text-sm py-2.5"
            disabled={isChangingStatus}
            variant="primary"
            onClick={onStartSprint}
          >
            {isChangingStatus ? (
              <>
                <Icon className="animate-spin h-4 w-4" name="spinner" />
                {t('sidebar.sprintActions.starting')}
              </>
            ) : (
              t('sidebar.sprintActions.startSprint')
            )}
          </Button>
          {!allChecksPassed && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center">
              {t('sidebar.sprintActions.checklistIncomplete')}
            </p>
          )}
        </>
      )}
      {canFinishSprint && (
        <Button
          className="w-full text-sm py-2.5"
          disabled={isChangingStatus}
          variant="danger"
          onClick={onFinishSprint}
        >
          {t('sidebar.sprintActions.finishSprint')}
        </Button>
      )}
    </div>
  );
}

