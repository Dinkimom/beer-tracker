import type { SprintInfo } from '@/types/tracker';

import toast from 'react-hot-toast';

import { updateSprintStatus } from '@/lib/beerTrackerApi';

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
  const confirmed = await params.confirm(params.t('sidebar.goalsTab.startConfirmAllPassed'), {
    title: params.t('sidebar.goalsTab.startSprintTitle'),
    variant: 'default',
    confirmText: params.t('sidebar.goalsTab.startConfirm'),
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
