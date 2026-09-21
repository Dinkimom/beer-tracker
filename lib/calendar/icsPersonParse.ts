import type { CalendarEventPerson } from './calendarEventTypes';

/** Раскодирует экранирование ICS (RFC 5545). */
export function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function readParam(params: string, name: string): string | undefined {
  const re = new RegExp(`${name}=(?:"([^"]*)"|([^;:]+))`, 'i');
  const match = re.exec(params);
  if (!match) return undefined;
  return unescapeIcsText((match[1] ?? match[2] ?? '').trim()) || undefined;
}

function parseMailto(value: string): string | undefined {
  const trimmed = value.trim();
  const withoutScheme = trimmed.replace(/^mailto:/i, '').trim();
  return withoutScheme || undefined;
}

export function parseIcsPerson(value: string, params: string): CalendarEventPerson {
  return {
    cn: readParam(params, 'CN'),
    email: parseMailto(value),
    partStat: readParam(params, 'PARTSTAT')?.toUpperCase(),
    role: readParam(params, 'ROLE')?.toUpperCase(),
  };
}
