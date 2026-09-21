import type { SlaBugInput } from './types';

import { daysSinceLastHdIncrease, parseDateMs, resolveLastHdAt } from './slaBugMetrics';

export const SLA_BUG_CLOSE_P4_TAG_SEND = 'closing_candidate';
export const SLA_BUG_CLOSE_P4_TAG_KEEP = 'bug_in_progress';

export type SlaBugCloseP4Action = 'keep' | 'send_for_approval';

export type CloseP4DecisionState = 'kept' | 'on_approval';

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function tagToken(value: string): string {
  return normalizeToken(value);
}

function appendTrackerTagValue(
  result: string[],
  seen: Set<string>,
  value: string
): void {
  const token = tagToken(value);
  if (value && !seen.has(token)) {
    seen.add(token);
    result.push(value);
  }
}

function appendTrackerTagItem(
  result: string[],
  seen: Set<string>,
  item: unknown
): void {
  if (typeof item === 'string') {
    appendTrackerTagValue(result, seen, item.trim());
    return;
  }
  if (!item || typeof item !== 'object') {
    return;
  }
  const record = item as { display?: string; id?: string; key?: string };
  appendTrackerTagValue(result, seen, (record.id ?? record.key ?? record.display ?? '').trim());
}

export function mergeTrackerTags(existing: unknown, tagToAdd: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  if (Array.isArray(existing)) {
    for (const item of existing) {
      appendTrackerTagItem(result, seen, item);
    }
  }

  appendTrackerTagValue(result, seen, tagToAdd.trim());
  return result;
}

function hasTrackerTag(existing: unknown, tag: string): boolean {
  const target = tagToken(tag);
  return mergeTrackerTags(existing, '').some((value) => tagToken(value) === target);
}

export function resolveCloseP4Tag(action: SlaBugCloseP4Action): string {
  return action === 'send_for_approval'
    ? SLA_BUG_CLOSE_P4_TAG_SEND
    : SLA_BUG_CLOSE_P4_TAG_KEEP;
}

/** Состояние решения по тегам Tracker (closing_candidate / bug_in_progress). */
export function resolveCloseP4DecisionState(tags: unknown): CloseP4DecisionState | null {
  if (hasTrackerTag(tags, SLA_BUG_CLOSE_P4_TAG_SEND)) {
    return 'on_approval';
  }
  if (hasTrackerTag(tags, SLA_BUG_CLOSE_P4_TAG_KEEP)) {
    return 'kept';
  }
  return null;
}

function formatCloseP4CommentLastHdAt(value: string | undefined): string {
  if (!value?.trim()) {
    return '—';
  }
  const ms = parseDateMs(value);
  if (ms == null) {
    return value.trim();
  }
  return new Date(ms).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildCloseP4ApprovalComment(
  input: Pick<SlaBugInput, 'createdAt' | 'hdCount' | 'lastHdAt'>,
  nowMs: number = Date.now()
): string {
  const resolvedLastHdAt = resolveLastHdAt(input.hdCount, input.lastHdAt, input.createdAt);
  const daysSinceLastHd =
    daysSinceLastHdIncrease(
      {
        id: '',
        priority: 'P4',
        createdAt: input.createdAt,
        hdCount: input.hdCount,
        hdGrowth24h: 0,
        hdGrowth7d: 0,
        inActiveWork: false,
        keyClient: false,
        lastHdAt: resolvedLastHdAt,
        supPriority: false,
      },
      nowMs
    ) ?? 0;
  const daysRounded = Math.max(0, Math.floor(daysSinceLastHd));
  const lastHdLabel = formatCloseP4CommentLastHdAt(resolvedLastHdAt);

  return `Задача без обращений ${daysRounded} дней. Последнее обращение было ${lastHdLabel}. Запрашиваем визу на закрытие задачи`;
}
