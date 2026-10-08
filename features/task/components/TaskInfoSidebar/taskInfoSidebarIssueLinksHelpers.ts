import type {
  IssueLinkRelationship,
  IssueTrackerIssueLink,
} from '@/lib/issueTrackerProvider/issueLinkTypes';

import { ISSUE_LINK_RELATIONSHIPS } from '@/lib/issueTrackerProvider/issueLinkTypes';

interface IssueLinkGroup {
  links: IssueTrackerIssueLink[];
  relationship: IssueLinkRelationship;
}

/** Группы в стабильном порядке канонических типов; пустые пропускаем. */
export function groupIssueLinksByRelationship(
  links: IssueTrackerIssueLink[]
): IssueLinkGroup[] {
  const byRel = new Map<IssueLinkRelationship, IssueTrackerIssueLink[]>();
  for (const relationship of ISSUE_LINK_RELATIONSHIPS) {
    byRel.set(relationship, []);
  }
  for (const link of links) {
    const bucket = byRel.get(link.relationship);
    if (bucket) {
      bucket.push(link);
    }
  }
  const groups: IssueLinkGroup[] = [];
  for (const relationship of ISSUE_LINK_RELATIONSHIPS) {
    const groupLinks = byRel.get(relationship) ?? [];
    if (groupLinks.length > 0) {
      groups.push({ relationship, links: groupLinks });
    }
  }
  return groups;
}

export function issueLinkRelationshipI18nKey(
  relationship: IssueLinkRelationship
): string {
  return `sprintPlanner.taskInfo.issueLinks.types.${relationship}`;
}
