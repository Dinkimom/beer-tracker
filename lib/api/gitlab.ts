import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';

interface MergeRequestFactResponse {
  factByLink?: Record<string, GitLabMergeRequestFact>;
}

function appendLinks(params: URLSearchParams, links: string[]): void {
  for (const link of links) {
    params.append('link', link);
  }
}

export async function fetchMergeRequestFacts(
  organizationId: string,
  links: string[]
): Promise<Record<string, GitLabMergeRequestFact>> {
  if (!organizationId || links.length === 0) {
    return {};
  }
  const params = new URLSearchParams();
  appendLinks(params, links);
  const res = await fetch(
    `/api/organizations/${encodeURIComponent(organizationId)}/gitlab/merge-requests/fact?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch merge request facts: ${res.status}`);
  }
  const data = (await res.json()) as MergeRequestFactResponse;
  return data.factByLink ?? {};
}
