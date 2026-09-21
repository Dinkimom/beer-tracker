import type { Developer } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { removeTeamMemberForBoard } from '@/lib/api/teamMembers';

/** Имя для confirm: сначала из попапа (свежий roster), иначе из списка планера. */
export function resolveTeamParticipantDisplayName(
  developerId: string,
  developers: ReadonlyArray<Pick<Developer, 'id' | 'name'>>,
  knownDisplayName?: string | null
): string {
  const fromKnown = knownDisplayName?.trim();
  if (fromKnown) return fromKnown;
  const fromList = developers.find((d) => d.id === developerId)?.name?.trim();
  if (fromList) return fromList;
  return developerId;
}

interface UseSprintPlannerMembersSyncParams {
  boardIdForPlannerData: number | null;
  developers: Developer[];
  selectedSprintId: number | null;
  confirmWithAction: (
    message: string,
    onConfirmAction: () => Promise<void> | void,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      loadingText?: string;
      variant?: 'default' | 'destructive';
    }
  ) => Promise<boolean>;
}

export function useSprintPlannerMembersSync({
  boardIdForPlannerData,
  confirmWithAction,
  developers,
  selectedSprintId,
}: UseSprintPlannerMembersSyncParams) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const handleRemoveParticipantFromTeam = useCallback(
    async (developerId: string, knownDisplayName?: string | null) => {
      if (!boardIdForPlannerData) {
        throw new Error(t('sprintPlanner.participants.boardNotSelected'));
      }
      const developerName = resolveTeamParticipantDisplayName(
        developerId,
        developers,
        knownDisplayName
      );
      let removed = false;
      const accepted = await confirmWithAction(
        t('sprintPlanner.participants.removeConfirm', { name: developerName }),
        async () => {
          await removeTeamMemberForBoard(boardIdForPlannerData, developerId);

          if (selectedSprintId) {
            queryClient.invalidateQueries({
              queryKey: ['tasks', selectedSprintId, boardIdForPlannerData ?? null],
            });
            queryClient.invalidateQueries({
              queryKey: ['tasks', 'occupancy', selectedSprintId, boardIdForPlannerData ?? null],
            });
          }
          removed = true;
          toast.success(
            t('sprintPlanner.participants.memberRemoved', { name: developerName })
          );
        },
        {
          title: t('sprintPlanner.participants.removeTitle'),
          confirmText: t('sprintPlanner.participants.removeConfirmBtn'),
          cancelText: t('common.cancel'),
          loadingText: t('sprintPlanner.participants.removing'),
          variant: 'destructive',
        }
      );
      return accepted && removed;
    },
    [boardIdForPlannerData, confirmWithAction, developers, queryClient, selectedSprintId, t]
  );

  useEffect(() => {
    const handler = () => {
      if (!selectedSprintId) return;
      queryClient.invalidateQueries({
        queryKey: ['tasks', selectedSprintId, boardIdForPlannerData ?? null],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'occupancy', selectedSprintId, boardIdForPlannerData ?? null],
      });
    };
    window.addEventListener('planner-members-updated', handler);
    return () => {
      window.removeEventListener('planner-members-updated', handler);
    };
  }, [boardIdForPlannerData, queryClient, selectedSprintId]);

  return { handleRemoveParticipantFromTeam };
}
