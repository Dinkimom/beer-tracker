/**
 * Sprint start / finish actions in the sidebar.
 */

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface SprintActionsProps {
  canFinishSprint: boolean;
  canStartSprint: boolean;
  isChangingStatus: boolean;
  onFinishSprint: () => void;
  onStartSprint: () => void;
}

export function SprintActions({
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
    <div className="flex-shrink-0 space-y-2 border-t border-black/10 px-4 pb-3 pt-3 dark:border-white/10">
      {canStartSprint && (
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
      )}
      {canFinishSprint && (
        <Button
          className="h-8 w-full rounded-md !border-red-600/25 !bg-red-600/10 px-3 text-xs font-semibold !text-red-800 hover:!bg-red-600/15 dark:!border-red-400/35 dark:!bg-red-500/15 dark:!text-red-200 dark:hover:!bg-red-500/25"
          disabled={isChangingStatus}
          variant="dangerOutline"
          onClick={onFinishSprint}
        >
          {t('sidebar.sprintActions.finishSprint')}
        </Button>
      )}
    </div>
  );
}

