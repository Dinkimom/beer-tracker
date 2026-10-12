export interface PlannerTrackerField {
  display?: string;
  id: string;
  key?: string;
  name?: string;
  options?: string[];
  schemaCustom?: string;
  schemaType?: string;
}

interface PlannerTrackerFieldOption {
  id: string;
  label: string;
  name: string;
}

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

function labelParts(field: PlannerTrackerField): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const candidates = [field.name, field.display, field.key];
  for (const candidate of candidates) {
    const text = trimmed(candidate);
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(text);
  }
  return out;
}

const FIXED_LIST_SUFFIXES = [
  ':cascadingselect',
  ':multicheckboxes',
  ':multiselect',
  ':radiobuttons',
  ':select',
];

function compareFieldLabels(left: PlannerTrackerFieldOption, right: PlannerTrackerFieldOption): number {
  return left.label.localeCompare(right.label);
}

function hasFixedListSchema(field: PlannerTrackerField): boolean {
  if (field.schemaType === 'option') {
    return true;
  }
  const custom = field.schemaCustom ?? '';
  for (const suffix of FIXED_LIST_SUFFIXES) {
    if (custom.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

/** Поле со списком фиксированных значений: селект Jira или варианты уже в каталоге. */
export function plannerTrackerFieldIsFixedList(field: PlannerTrackerField | undefined): boolean {
  if (!field) {
    return false;
  }
  if (field.options && field.options.length > 0) {
    return true;
  }
  return hasFixedListSchema(field);
}

/** Подписи как в селекте полей админки: имя, отображаемое имя и ключ без повторов. */
export function plannerTrackerFieldOptions(
  fields: readonly PlannerTrackerField[],
  addedIds: ReadonlySet<string>
): PlannerTrackerFieldOption[] {
  const options: PlannerTrackerFieldOption[] = [];
  for (const field of fields) {
    const id = field.id.trim();
    if (!id || addedIds.has(id)) {
      continue;
    }
    const parts = labelParts(field);
    const name = parts[0] ?? id;
    options.push({
      id,
      label: parts.length > 0 ? parts.join(' · ') : id,
      name,
    });
  }
  options.sort(compareFieldLabels);
  return options;
}
