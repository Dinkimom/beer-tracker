/**
 * Канонические типы связей Beer Tracker ↔ Yandex Tracker relationship.
 * Иерархия (parent/subtask/epic) сюда не входит — она в хлебных крошках.
 */

type IssueLinkRelationship =
  | 'blocked_by'
  | 'blocks'
  | 'duplicated_by'
  | 'duplicates'
  | 'relates';

export type IssueLinkDirection = 'inward' | 'outward';

/** Типы, доступные при создании связи из планера / API. */
const ISSUE_LINK_CREATE_RELATIONSHIPS = [
  'relates',
  'blocks',
  'blocked_by',
  'duplicates',
] as const satisfies ReadonlyArray<IssueLinkRelationship>;

export type IssueLinkCreateRelationship = (typeof ISSUE_LINK_CREATE_RELATIONSHIPS)[number];

export interface IssueTrackerIssueLink {
  direction: IssueLinkDirection;
  id: string;
  linkedIssueKey: string;
  linkedStatus?: string | null;
  linkedSummary?: string | null;
  relationship: IssueLinkRelationship;
}

export interface IssueTrackerCreateIssueLinkInput {
  relationship: IssueLinkCreateRelationship;
  targetIssueKey: string;
}

const YANDEX_POST_BY_BT: Record<IssueLinkCreateRelationship, string> = {
  relates: 'relates',
  blocks: 'is dependent by',
  blocked_by: 'depends on',
  duplicates: 'duplicates',
};

const HIERARCHY_RELATIONSHIP_TOKENS = new Set([
  'is subtask for',
  'is parent task for',
  'is epic of',
  'has epic',
  'subtask',
  'epic',
]);

function normalizeRelationshipToken(raw: string): string {
  return raw.trim().toLowerCase().replaceAll('_', ' ');
}

/** Yandex POST `relationship` для канонического BT-типа. */
export function yandexRelationshipForCreate(
  relationship: IssueLinkCreateRelationship
): string {
  return YANDEX_POST_BY_BT[relationship];
}

/**
 * Канон BT из подписи связи относительно текущей задачи
 * (direction + type.inward/outward или строка POST relationship).
 */
export function mapTrackerRelationshipLabelToCanonical(
  label: string
): IssueLinkRelationship | null {
  const token = normalizeRelationshipToken(label);
  if (!token || HIERARCHY_RELATIONSHIP_TOKENS.has(token)) {
    return null;
  }
  if (token === 'relates' || token === 'relates to') {
    return 'relates';
  }
  if (token === 'is dependent by' || token === 'blocks') {
    return 'blocks';
  }
  if (
    token === 'depends on' ||
    token === 'blocked by' ||
    token === 'blocked_by' ||
    token === 'is blocked by'
  ) {
    return 'blocked_by';
  }
  if (token === 'duplicates') {
    return 'duplicates';
  }
  if (token === 'is duplicated by' || token === 'duplicated by' || token === 'duplicated_by') {
    return 'duplicated_by';
  }
  return null;
}

function isIssueLinkCreateRelationship(
  value: string
): value is IssueLinkCreateRelationship {
  return (ISSUE_LINK_CREATE_RELATIONSHIPS as readonly string[]).includes(value);
}

export { isIssueLinkCreateRelationship };
