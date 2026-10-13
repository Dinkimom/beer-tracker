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
  /**
   * Канон BT, если фраза трекера известна.
   * `null` — своя фраза Jira/Tracker («has linked QA task», «has to be done after»).
   */
  relationship: IssueLinkRelationship | null;
  /** Фраза inward/outward как в трекере, с точки зрения текущей задачи. */
  relationshipLabel?: string;
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

/** Общая связь: английский relates и русская фраза Jira. Не конкретный тип вроде QA. */
const GENERIC_RELATES_LABELS = new Set([
  'relates',
  'relates to',
  'связана',
  'связана с задачей',
]);

export function isGenericRelatesLabel(label: string): boolean {
  return GENERIC_RELATES_LABELS.has(normalizeRelationshipToken(label));
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

export function isHierarchyIssueLinkLabel(label: string): boolean {
  return HIERARCHY_RELATIONSHIP_TOKENS.has(normalizeRelationshipToken(label));
}

/**
 * Связь для планера. Иерархию (parent/subtask/epic) по-прежнему не тащим.
 * Неизвестная фраза остаётся как `relationshipLabel`, без канона.
 */
export function resolveStoredIssueLinkRelationship(label: string): {
  relationship: IssueLinkRelationship | null;
  relationshipLabel: string;
} | null {
  const relationshipLabel = label.trim();
  if (!relationshipLabel || isHierarchyIssueLinkLabel(relationshipLabel)) {
    return null;
  }
  return {
    relationship: mapTrackerRelationshipLabelToCanonical(relationshipLabel),
    relationshipLabel,
  };
}

function isIssueLinkCreateRelationship(
  value: string
): value is IssueLinkCreateRelationship {
  return (ISSUE_LINK_CREATE_RELATIONSHIPS as readonly string[]).includes(value);
}

export { isIssueLinkCreateRelationship };
