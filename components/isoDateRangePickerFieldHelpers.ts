import { parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

function closedRangeDayClassName(
  iso: string,
  start: string,
  end: string
): string | null {
  const isEndpoint = iso === start || iso === end;
  if (isEndpoint) {
    return '!bg-blue-600 !text-white hover:!bg-blue-700 dark:!bg-blue-600 dark:hover:!bg-blue-500 rounded-md';
  }
  if (iso > start && iso < end) {
    return 'rounded-none bg-blue-100 text-gray-800 hover:!bg-blue-200 dark:bg-blue-900/40 dark:text-gray-100 dark:hover:!bg-blue-800/50';
  }
  return null;
}

function defaultDayClassName(isToday: boolean): string {
  if (isToday) {
    return 'text-gray-800 ring-2 ring-inset ring-blue-500 dark:text-gray-100 dark:ring-blue-400 hover:!bg-gray-100 dark:hover:!bg-gray-700 rounded-md';
  }
  return 'text-gray-800 hover:!bg-gray-100 dark:text-gray-100 dark:hover:!bg-gray-700 rounded-md';
}

export function isoDateRangeDayClassName(
  iso: string,
  draft: { end: string | null; start: string | null },
  todayUtc: { d: number; m: number; y: number },
  viewM: number,
  viewY: number,
): string {
  const isToday = viewY === todayUtc.y && viewM === todayUtc.m && parseIsoDateOnly(iso)?.d === todayUtc.d;
  const { start: s, end: e } = draft;

  if (s && e && s <= e) {
    const closed = closedRangeDayClassName(iso, s, e);
    return closed ?? defaultDayClassName(isToday);
  }

  if (s && !e && iso === s) {
    return '!bg-blue-600 !text-white hover:!bg-blue-700 dark:!bg-blue-600 dark:hover:!bg-blue-500 rounded-md';
  }

  return defaultDayClassName(isToday);
}

export function syncIsoDateRangePickerOnOpen(params: {
  anchorIso: string | null;
  endDate: string;
  nowUtc: { m: number; y: number };
  startDate: string;
}): {
  draft: { end: string | null; start: string | null };
  todayUtc: { d: number; m: number; y: number };
  viewM: number;
  viewY: number;
} {
  const t = new Date();
  const todayUtc = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  const p = params.anchorIso ? parseIsoDateOnly(params.anchorIso) : null;
  const viewY = p?.y ?? params.nowUtc.y;
  const viewM = p?.m ?? params.nowUtc.m;
  const draft = {
    start: parseIsoDateOnly(params.startDate) ? params.startDate : null,
    end: parseIsoDateOnly(params.endDate) ? params.endDate : null,
  };
  return { draft, todayUtc, viewM, viewY };
}

export function resolveIsoDateRangeDayPick(
  iso: string,
  draft: { end: string | null; start: string | null }
): { close: boolean; next: { end: string | null; start: string | null }; range?: { endDate: string; startDate: string } } {
  const s = draft.start;
  const e = draft.end;
  const hasFull = Boolean(s && e);

  if (!s || hasFull) {
    return { close: false, next: { start: iso, end: null } };
  }

  let a = s;
  let b = iso;
  if (b < a) {
    const swap = a;
    a = b;
    b = swap;
  }
  return { close: true, next: { start: a, end: b }, range: { startDate: a, endDate: b } };
}
