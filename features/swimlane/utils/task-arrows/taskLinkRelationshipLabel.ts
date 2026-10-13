import type { TaskPosition } from '@/types';

import { isGenericRelatesLabel } from '@/lib/issueTrackerProvider/issueLinkTypes';
import { resolveLinkArrowDrawTaskIds } from '@/utils/linkAnchors';

/**
 * Подпись типа связи на стрелке hover-кластера.
 * Сырая фраза трекера уже направленная — её показываем как есть.
 * Канон без фразы разворачиваем вместе со стрелкой раньше → позже.
 * Если на одной стрелке есть и relates, и конкретный тип — показываем конкретный.
 */

/** Длиннее этого — плашка фиксированной ширины в две строки. */
const TASK_LINK_RELATIONSHIP_CHIP_WRAP_AFTER = 16;

const ISSUE_LINK_RELATIONSHIP_INVERSE: Record<string, string> = {
  blocked_by: 'blocks',
  blocks: 'blocked_by',
  duplicated_by: 'duplicates',
  duplicates: 'duplicated_by',
  relates: 'relates',
};

const ISSUE_LINK_RELATIONSHIP_MESSAGE_KEY: Record<string, string> = {
  blocked_by: 'sprintPlanner.links.relationship.blockedBy',
  blocks: 'sprintPlanner.links.relationship.blocks',
  duplicated_by: 'sprintPlanner.links.relationship.duplicatedBy',
  duplicates: 'sprintPlanner.links.relationship.duplicates',
  relates: 'sprintPlanner.links.relationship.relates',
};

export function resolveTaskLinkRelationshipForArrow(input: {
  fromTaskId: string;
  relationship: string;
  startTaskId: string;
  toTaskId: string;
}): string {
  const relationship = input.relationship.trim();
  const arrowStartsAtTarget =
    input.startTaskId === input.toTaskId && input.startTaskId !== input.fromTaskId;
  if (!arrowStartsAtTarget) {
    return relationship;
  }
  return ISSUE_LINK_RELATIONSHIP_INVERSE[relationship] ?? relationship;
}

export function taskLinkRelationshipMessageKey(relationship: string): string | null {
  return ISSUE_LINK_RELATIONSHIP_MESSAGE_KEY[relationship] ?? null;
}

export function resolveTaskLinkRelationshipCaption(input: {
  fromTaskId: string;
  relationship?: string | null;
  relationshipLabel?: string | null;
  startTaskId: string;
  toTaskId: string;
  translate: (key: string) => string;
}): string | null {
  const relationshipLabel = input.relationshipLabel?.trim() ?? '';
  if (relationshipLabel) {
    return relationshipLabel;
  }
  const relationship = input.relationship?.trim() ?? '';
  if (!relationship) {
    return null;
  }
  const alongArrow = resolveTaskLinkRelationshipForArrow({
    fromTaskId: input.fromTaskId,
    relationship,
    startTaskId: input.startTaskId,
    toTaskId: input.toTaskId,
  });
  const messageKey = taskLinkRelationshipMessageKey(alongArrow);
  if (messageKey) {
    return input.translate(messageKey);
  }
  return alongArrow.replaceAll('_', ' ');
}

export function taskLinkRelationshipChipWraps(caption: string): boolean {
  return caption.trim().length > TASK_LINK_RELATIONSHIP_CHIP_WRAP_AFTER;
}

function preferSpecificRelationshipCaption(
  captions: ReadonlyArray<{ caption: string; genericRelates: boolean }>
): string {
  const specific = captions.filter((item) => !item.genericRelates);
  const pool = specific.length > 0 ? specific : captions;
  return pool[pool.length - 1]!.caption;
}

export interface GroupedTaskLinkRelationshipCaption {
  captions: string[];
  endTaskId: string;
  key: string;
  startTaskId: string;
}

export interface RelationshipMarkerPresenceItem {
  exiting: boolean;
  item: GroupedTaskLinkRelationshipCaption;
}

/** Оставляет ушедшие подписи на время exit-анимации. При reduced motion снимает сразу. */
export function mergeRelationshipMarkerPresence(
  previous: readonly RelationshipMarkerPresenceItem[],
  next: readonly GroupedTaskLinkRelationshipCaption[],
  reducedMotion: boolean
): RelationshipMarkerPresenceItem[] {
  const nextKeys = new Set(next.map((item) => item.key));
  const live = next.map((item) => ({ exiting: false, item }));
  if (reducedMotion) {
    return live;
  }
  const exiting = previous
    .filter((entry) => !nextKeys.has(entry.item.key))
    .map((entry) => ({ exiting: true, item: entry.item }));
  return [...live, ...exiting];
}

interface RelationshipCaptionDraft {
  caption: string;
  genericRelates: boolean;
}

export function groupTaskLinkRelationshipCaptions(input: {
  links: ReadonlyArray<{
    fromTaskId: string;
    id: string;
    relationship?: string | null;
    relationshipLabel?: string | null;
    toTaskId: string;
  }>;
  taskPositions?: Map<string, TaskPosition>;
  translate: (key: string) => string;
}): GroupedTaskLinkRelationshipCaption[] {
  const groups = new Map<
    string,
    { drafts: RelationshipCaptionDraft[]; endTaskId: string; startTaskId: string }
  >();
  for (const link of input.links) {
    const { startTaskId, endTaskId } = resolveLinkArrowDrawTaskIds(
      link.fromTaskId,
      link.toTaskId,
      input.taskPositions
    );
    const caption = resolveTaskLinkRelationshipCaption({
      fromTaskId: link.fromTaskId,
      relationship: link.relationship,
      relationshipLabel: link.relationshipLabel,
      startTaskId,
      toTaskId: link.toTaskId,
      translate: input.translate,
    });
    if (!caption) {
      continue;
    }
    const key = `${startTaskId}\0${endTaskId}`;
    const draft = {
      caption,
      genericRelates: link.relationship === 'relates' || isGenericRelatesLabel(caption),
    };
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { drafts: [draft], endTaskId, startTaskId });
      continue;
    }
    if (!group.drafts.some((item) => item.caption === caption)) {
      group.drafts.push(draft);
    }
  }
  return [...groups.entries()].map(([key, group]) => ({
    captions: [preferSpecificRelationshipCaption(group.drafts)],
    endTaskId: group.endTaskId,
    key,
    startTaskId: group.startTaskId,
  }));
}
