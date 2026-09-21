import type { ParsedCalendarEvent } from './calendarEventTypes';

import { RRule } from 'rrule';

import { parseIcsDateValue } from './parseIcsCalendarDataHelpers';

function recurrenceIdToMs(recurrenceId: string): number {
  return parseIcsDateValue(recurrenceId, '').ms;
}

function overlapsRange(
  startMs: number,
  endMs: number,
  rangeStartMs: number,
  rangeEndMs: number
): boolean {
  return endMs > rangeStartMs && startMs < rangeEndMs;
}

function buildOccurrence(
  master: ParsedCalendarEvent,
  startMs: number
): ParsedCalendarEvent {
  const duration = Math.max(0, master.endMs - master.startMs);
  return {
    ...master,
    endMs: startMs + duration,
    exdateMs: [],
    hasRrule: false,
    recurrenceId: String(startMs),
    rrule: undefined,
    startMs,
  };
}

function listRruleStarts(
  master: ParsedCalendarEvent,
  rangeStartMs: number,
  rangeEndMs: number
): number[] {
  if (!master.rrule) return [];

  try {
    const options = RRule.parseString(master.rrule);
    options.dtstart = new Date(master.startMs);
    const rule = new RRule(options);
    const duration = Math.max(0, master.endMs - master.startMs);
    return rule
      .between(new Date(rangeStartMs - duration), new Date(rangeEndMs), true)
      .map((d) => d.getTime())
      .filter((startMs) =>
        overlapsRange(startMs, startMs + duration, rangeStartMs, rangeEndMs)
      );
  } catch {
    return overlapsRange(master.startMs, master.endMs, rangeStartMs, rangeEndMs)
      ? [master.startMs]
      : [];
  }
}

function findOverrideForStart(
  overrides: ParsedCalendarEvent[],
  occurrenceStartMs: number
): ParsedCalendarEvent | undefined {
  return overrides.find((override) => {
    if (!override.recurrenceId) return false;
    const ridMs = recurrenceIdToMs(override.recurrenceId);
    return Number.isFinite(ridMs) && ridMs === occurrenceStartMs;
  });
}

function isVisibleBusyInRange(
  event: ParsedCalendarEvent,
  rangeStartMs: number,
  rangeEndMs: number
): boolean {
  if (event.status === 'cancelled' || event.transparent) return false;
  return overlapsRange(event.startMs, event.endMs, rangeStartMs, rangeEndMs);
}

function resolveOccurrence(
  master: ParsedCalendarEvent,
  startMs: number,
  overrides: ParsedCalendarEvent[],
  usedOverrideKeys: Set<string>,
  rangeStartMs: number,
  rangeEndMs: number
): ParsedCalendarEvent | null {
  const override = findOverrideForStart(overrides, startMs);
  if (override) {
    usedOverrideKeys.add(override.recurrenceId ?? String(override.startMs));
    return isVisibleBusyInRange(override, rangeStartMs, rangeEndMs)
      ? { ...override, hasRrule: false, rrule: undefined }
      : null;
  }
  return buildOccurrence(master, startMs);
}

function appendMovedOverrides(
  overrides: ParsedCalendarEvent[],
  usedOverrideKeys: Set<string>,
  rangeStartMs: number,
  rangeEndMs: number,
  into: ParsedCalendarEvent[]
): void {
  for (const override of overrides) {
    const key = override.recurrenceId ?? String(override.startMs);
    if (usedOverrideKeys.has(key)) continue;
    if (!isVisibleBusyInRange(override, rangeStartMs, rangeEndMs)) continue;
    into.push({ ...override, hasRrule: false, rrule: undefined });
  }
}

function expandMasterInRange(
  master: ParsedCalendarEvent,
  overrides: ParsedCalendarEvent[],
  rangeStartMs: number,
  rangeEndMs: number
): ParsedCalendarEvent[] {
  const exdates = new Set(master.exdateMs);
  const usedOverrideKeys = new Set<string>();
  const instances: ParsedCalendarEvent[] = [];

  for (const startMs of listRruleStarts(master, rangeStartMs, rangeEndMs)) {
    if (exdates.has(startMs)) continue;
    const resolved = resolveOccurrence(
      master,
      startMs,
      overrides,
      usedOverrideKeys,
      rangeStartMs,
      rangeEndMs
    );
    if (resolved) instances.push(resolved);
  }

  appendMovedOverrides(overrides, usedOverrideKeys, rangeStartMs, rangeEndMs, instances);
  return instances;
}

/**
 * Разворачивает RRULE-мастеры в экземпляры внутри [rangeStart, rangeEnd].
 * Mail.ru CalDAV часто игнорирует `<C:expand>` и отдаёт только мастер с RRULE.
 */
export function expandRecurringCalendarEvents(
  events: ParsedCalendarEvent[],
  rangeStartMs: number,
  rangeEndMs: number
): ParsedCalendarEvent[] {
  const byUid = new Map<string, ParsedCalendarEvent[]>();
  for (const event of events) {
    const list = byUid.get(event.uid) ?? [];
    list.push(event);
    byUid.set(event.uid, list);
  }

  const result: ParsedCalendarEvent[] = [];

  for (const group of byUid.values()) {
    const master = group.find((e) => e.hasRrule && e.rrule && !e.recurrenceId);
    if (master) {
      const overrides = group.filter((e) => Boolean(e.recurrenceId));
      result.push(
        ...expandMasterInRange(master, overrides, rangeStartMs, rangeEndMs)
      );
      continue;
    }
    result.push(...group);
  }

  return result;
}
