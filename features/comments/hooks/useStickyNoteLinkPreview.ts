'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchLinkPreview } from '@/lib/api/linkPreview';

const LINK_PREVIEW_STALE_MS = 60 * 60 * 1000;
const LINK_PREVIEW_GC_MS = 6 * 60 * 60 * 1000;

export function useStickyNoteLinkPreview(url: string) {
  return useQuery({
    gcTime: LINK_PREVIEW_GC_MS,
    queryFn: ({ signal }) => fetchLinkPreview(url, signal),
    queryKey: ['link-preview', url],
    staleTime: LINK_PREVIEW_STALE_MS,
  });
}
