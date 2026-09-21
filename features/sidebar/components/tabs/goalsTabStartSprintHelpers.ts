import type { SprintInfo } from '@/types/tracker';

import toast from 'react-hot-toast';

import { updateSprintStatus } from '@/lib/beerTrackerApi';

function getStartSprintConfirmMessage(allChecksPassed: boolean, t: (key: string) => string): string {
  if (allChecksPassed) {
    return t('sidebar.goalsTab.startConfirmAllPassed');
  }
  return t('sidebar.goalsTab.startConfirmChecklistIncomplete');
}

function getStartSprintConfirmText(allChecksPassed: boolean, t: (key: string) => string): string {
  if (allChecksPassed) {
    return t('sidebar.goalsTab.startConfirm');
  }
  return t('sidebar.goalsTab.startConfirmAnyway');
}

function applyStartSprintResult(params: {
  onSprintStatusUpdated: (updatedSprint: SprintInfo) => void;
  onTasksReload?: () => void;
  result: Awaited<ReturnType<typeof updateSprintStatus>>;
  t: (key: string) => string;
}): void {
  if (!params.result.success) {
    toast.error(params.result.error || params.t('sidebar.goalsTab.startFailed'));
    return;
  }

  toast.success(params.t('sidebar.goalsTab.sprintStarted'));
  if (params.result.sprint) {
    params.onSprintStatusUpdated(params.result.sprint);
  }

  if (params.onTasksReload) {
    params.onTasksReload();
  }
}

export async function submitStartSprint(params: {
  allChecksPassed: boolean;
  confirm: (
    message: string,
    options: {
      title: string;
      variant: 'default' | 'destructive';
      confirmText: string;
    },
  ) => Promise<boolean>;
  onSprintStatusUpdated: (updatedSprint: SprintInfo) => void;
  onTasksReload?: () => void;
  setIsChangingStatus: (value: boolean) => void;
  sprintInfo: { id: number; version?: number };
  t: (key: string) => string;
}): Promise<void> {
  const confirmed = await params.confirm(getStartSprintConfirmMessage(params.allChecksPassed, params.t), {
    title: params.t('sidebar.goalsTab.startSprintTitle'),
    variant: params.allChecksPassed ? 'default' : 'destructive',
    confirmText: getStartSprintConfirmText(params.allChecksPassed, params.t),
  });
  if (!confirmed) {
    return;
  }

  params.setIsChangingStatus(true);
  try {
    const result = await updateSprintStatus(
      params.sprintInfo.id,
      'in_progress',
      params.sprintInfo.version,
    );
    applyStartSprintResult({
      onSprintStatusUpdated: params.onSprintStatusUpdated,
      onTasksReload: params.onTasksReload,
      result,
      t: params.t,
    });
  } catch (error) {
    console.error('Failed to start sprint:', error);
    toast.error(params.t('sidebar.goalsTab.startFailed'));
  } finally {
    params.setIsChangingStatus(false);
  }
}
