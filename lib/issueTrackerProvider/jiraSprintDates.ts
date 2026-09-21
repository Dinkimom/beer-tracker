const GH_MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const GH_DATE = /^(\d{1,2})\/([A-Za-z]{3})\/(\d{2})(?:\s|$)/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function utcDateParts(d: Date): { date: string; dateTime: string } {
  const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  return { date, dateTime: `${date}T00:00:00.000+0000` };
}

function parseGreenhopperDate(raw: string): Date | null {
  const match = GH_DATE.exec(raw.trim());
  if (!match) {
    return null;
  }
  const monthToken = match[2];
  if (!monthToken) {
    return null;
  }
  const month = GH_MONTH_INDEX[monthToken.toLowerCase()];
  if (month == null) {
    return null;
  }
  return new Date(Date.UTC(2000 + Number(match[3]), month, Number(match[1])));
}

function normalizeIsoOffset(raw: string): string {
  if (raw.endsWith('Z')) {
    return `${raw.slice(0, -1)}+0000`;
  }
  return raw.replace(/([+-]\d{2}):(\d{2})$/, '$1$2');
}

export function parseJiraSprintDate(raw: unknown): { date: string; dateTime: string } {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return utcDateParts(new Date(raw));
  }
  if (typeof raw !== 'string') {
    return { date: '', dateTime: '' };
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') {
    return { date: '', dateTime: '' };
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return { date: trimmed.slice(0, 10), dateTime: normalizeIsoOffset(trimmed) };
  }
  const gh = parseGreenhopperDate(trimmed);
  if (gh) {
    return utcDateParts(gh);
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return { date: '', dateTime: trimmed };
  }
  return utcDateParts(new Date(parsed));
}
