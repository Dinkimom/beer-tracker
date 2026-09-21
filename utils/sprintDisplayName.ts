const SPRINT_QUARTER_NAME_SEPARATOR = ' · ';

/** Номер спринта: четыре цифры с опциональным суффиксом «.N» (например «2601» или «2601.1»). */
const SPRINT_NUMBER_PATTERN = /\d{4}(?:\.\d)?/;

/** Номер спринта без названия команды («Team 2601» → «2601», «Team 2601.1» → «2601.1»). */
export function extractSprintNumberFromName(sprintName: string): string {
  const trimmed = sprintName.trim();
  const trailing = trimmed.match(/(\d{4}(?:\.\d)?)\s*$/);
  if (trailing) {
    return trailing[1];
  }
  const any = trimmed.match(SPRINT_NUMBER_PATTERN);
  if (any) {
    return any[0];
  }
  const legacyTrailing = trimmed.match(/(\d{2,9})\s*$/);
  if (legacyTrailing) {
    return legacyTrailing[1];
  }
  const legacyAny = trimmed.match(/\d+/);
  if (legacyAny) {
    return legacyAny[0];
  }
  return trimmed;
}

/** Сравнение номеров спринтов по убыванию (2601.2 > 2601.1 > 2601 > 2525). */
export function compareSprintNamesByNumberDesc(a: string, b: string): number {
  const parse = (name: string) => {
    const label = extractSprintNumberFromName(name);
    const match = label.match(/^(\d{4})(?:\.(\d))?$/);
    if (match) {
      return {
        base: Number.parseInt(match[1]!, 10),
        sub: match[2] ? Number.parseInt(match[2], 10) : 0,
      };
    }
    const legacy = Number.parseInt(label, 10);
    return {
      base: Number.isFinite(legacy) ? legacy : 0,
      sub: 0,
    };
  };

  const left = parse(a);
  const right = parse(b);
  if (left.base !== right.base) {
    return right.base - left.base;
  }
  return right.sub - left.sub;
}

export function formatSprintDisplayName(
  name: string,
  quarter?: string | null
): string {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return name;
  }

  const sprintNumber = extractSprintNumberFromName(trimmedName);
  const q = quarter?.trim();
  if (!q) {
    return sprintNumber;
  }

  return `${q}${SPRINT_QUARTER_NAME_SEPARATOR}${sprintNumber}`;
}

export function formatSprintListItemDisplayName(sprint: {
  name: string;
  quarter?: string | null;
}): string {
  return formatSprintDisplayName(sprint.name, sprint.quarter);
}

const SPRINT_SELECT_DATE_PARTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };

/** Подпись опции в кастомном селекте спринта: «Q1 · 2601 (01.09 - 14.09)». */
export function formatSprintSelectOptionLabel(
  sprint: {
    endDate?: string | null;
    name: string;
    quarter?: string | null;
    startDate?: string | null;
  },
  locale = 'ru-RU'
): string {
  const displayName = formatSprintListItemDisplayName(sprint);
  if (!sprint.startDate || !sprint.endDate) {
    return displayName;
  }
  const start = new Date(sprint.startDate).toLocaleDateString(locale, SPRINT_SELECT_DATE_PARTS);
  const end = new Date(sprint.endDate).toLocaleDateString(locale, SPRINT_SELECT_DATE_PARTS);
  return `${displayName} (${start} - ${end})`;
}

/** Короткая подпись спринта с префиксом квартала («Team 2601» + Q1 → «Q1 · 2601»). */
export function formatSprintHeaderShortLabelWithQuarter(
  sprintName: string,
  quarter?: string | null
): string {
  return formatSprintDisplayName(sprintName, quarter);
}
