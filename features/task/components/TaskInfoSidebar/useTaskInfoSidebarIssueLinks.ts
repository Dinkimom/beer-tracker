'use client';

import type {
  IssueLinkCreateRelationship,
  IssueTrackerIssueLink,
} from '@/lib/issueTrackerProvider/issueLinkTypes';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createIssueLink,
  deleteIssueLink,
  fetchIssueLinks,
} from '@/lib/api/issues';

function issueLinksQueryKey(issueKey: string) {
  return ['issue-links', issueKey] as const;
}

export function useTaskInfoSidebarIssueLinks(issueKey: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = issueLinksQueryKey(issueKey);

  const query = useQuery({
    queryKey,
    enabled: enabled && Boolean(issueKey),
    queryFn: () => fetchIssueLinks(issueKey),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      relationship: IssueLinkCreateRelationship;
      targetIssueKey: string;
    }) => createIssueLink(issueKey, payload),
    onSuccess: (link) => {
      queryClient.setQueryData<{ fromCache: boolean; links: IssueTrackerIssueLink[] }>(
        queryKey,
        (prev) => ({
          fromCache: false,
          links: [...(prev?.links ?? []).filter((item) => item.id !== link.id), link],
        })
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => deleteIssueLink(issueKey, linkId),
    onSuccess: (_data, linkId) => {
      queryClient.setQueryData<{ fromCache: boolean; links: IssueTrackerIssueLink[] }>(
        queryKey,
        (prev) => ({
          fromCache: prev?.fromCache ?? false,
          links: (prev?.links ?? []).filter((item) => item.id !== linkId),
        })
      );
    },
  });

  return {
    createError: createMutation.error,
    createLink: createMutation.mutateAsync,
    deleteError: deleteMutation.error,
    deleteLink: deleteMutation.mutateAsync,
    fromCache: query.data?.fromCache ?? false,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isLoading: query.isLoading,
    links: query.data?.links ?? [],
    refetch: query.refetch,
  };
}
