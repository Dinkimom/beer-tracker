import type { TrackerIssueLinkEdge } from '@/lib/issues/trackerIssueLinksRouteHelpers';
import type { TaskLink } from '@/types';

const TRACKER_LINK_ID_PREFIX = 'tracker:';

export function toTrackerOverlayLinkId(trackerLinkId: string): string {
  return `${TRACKER_LINK_ID_PREFIX}${trackerLinkId}`;
}

export function parseTrackerOverlayLinkId(linkId: string): string | null {
  if (!linkId.startsWith(TRACKER_LINK_ID_PREFIX)) {
    return null;
  }
  const id = linkId.slice(TRACKER_LINK_ID_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function mapTrackerIssueLinkEdgesToTaskLinks(
  edges: TrackerIssueLinkEdge[],
  issueKeyToTaskId: ReadonlyMap<string, string>
): TaskLink[] {
  const out: TaskLink[] = [];
  for (const edge of edges) {
    const fromTaskId = issueKeyToTaskId.get(edge.fromIssueKey);
    const toTaskId = issueKeyToTaskId.get(edge.toIssueKey);
    if (!fromTaskId || !toTaskId || fromTaskId === toTaskId) {
      continue;
    }
    out.push({
      id: toTrackerOverlayLinkId(edge.id),
      fromTaskId,
      toTaskId,
      origin: 'tracker',
      relationship: edge.relationship,
    });
  }
  return out;
}

export function mergePlannerAndTrackerTaskLinks(
  plannerLinks: TaskLink[],
  trackerLinks: TaskLink[]
): TaskLink[] {
  if (trackerLinks.length === 0) {
    return plannerLinks;
  }
  const seen = new Set(plannerLinks.map((link) => link.id));
  const merged = [...plannerLinks];
  for (const link of trackerLinks) {
    if (seen.has(link.id)) {
      continue;
    }
    seen.add(link.id);
    merged.push(link);
  }
  return merged;
}
