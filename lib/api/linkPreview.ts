import { createFallbackLinkPreview, type LinkPreview } from '@/lib/comments/linkPreviewTypes';
import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function fetchLinkPreview(url: string, signal?: AbortSignal): Promise<LinkPreview> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<LinkPreview>('/link-preview', {
      params: { url },
      signal,
      timeout: 5_000,
    });
    if (data?.url && data.title) {
      return data;
    }
    return createFallbackLinkPreview(url);
  } catch {
    return createFallbackLinkPreview(url);
  }
}
