/** Утилиты для строк даты YYYY-MM-DD в календарном UTC (как в событиях доступности). */

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Локальная календарная дата → YYYY-MM-DD (ячейка спринта, не UTC-instant). */
export function formatLocalDateToIsoDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDateOnly(iso: string): { d: number; m: number; y: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d < 1 || d > last || mo < 1 || mo > 12) return null;
  return { y, m: mo, d };
}

export function formatIsoDateRuLongUtc(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Короткий числовой вид для компактных подписей (UTC, как строка YYYY-MM-DD). */
export function formatIsoDateRuNumericUtc(iso: string): string {
  const p = parseIsoDateOnly(iso);
  if (!p) return iso;
  return `${pad2(p.d)}.${pad2(p.m)}.${p.y}`;
}
