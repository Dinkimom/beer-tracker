import type { SlaBugCloseP4Action } from '@/lib/slaBugs/closeP4Actions';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { applySlaBugCloseP4Action } from '@/lib/api/slaBugCloseAction';

import { slaBugsQueryKey } from './useSlaBugs';

export function useSlaBugCloseP4Action(boardId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      action,
      issueKey,
    }: {
      action: SlaBugCloseP4Action;
      issueKey: string;
    }) => applySlaBugCloseP4Action(issueKey, action),
    onSuccess: async () => {
      if (boardId != null && boardId > 0) {
        await queryClient.invalidateQueries({ queryKey: slaBugsQueryKey(boardId) });
      }
    },
  });
}
