import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task } from '@/types';

import { isRecord } from '@/lib/isRecord';

import {
  applyTaskCardSlotDensity,
  keepWhenSlotHiddenSpread,
  readKeepWhenSlotHidden,
} from './taskCardSlotDensity';
import { readTaskCardValueLabels } from './taskCardValueLabels';

/**
 * Слоты карточки свимлейна.
 * Поле из набора или поле трекера лежит в одном слоте и рисуется одним способом.
 */
export const TASK_CARD_SLOT_IDS = ['eyebrow', 'titleLead', 'footer', 'footerEnd'] as const;
export type TaskCardSlotId = (typeof TASK_CARD_SLOT_IDS)[number];

/** Порядок полей на классической карточке: так же собирается раскладка по умолчанию. */
const TASK_CARD_FIELD_IDS = [
  'parent',
  'priority',
  'type',
  'key',
  'status',
  'estimate',
  'assignee',
] as const;
export type TaskCardFieldId = (typeof TASK_CARD_FIELD_IDS)[number];

const TASK_CARD_PRESENTATIONS = ['hidden', 'text', 'link', 'icon', 'tag', 'dot'] as const;
export type TaskCardPresentation = (typeof TASK_CARD_PRESENTATIONS)[number];

export const TASK_CARD_DENSITIES = ['regular', 'narrow', 'compact'] as const;
export type TaskCardDensity = (typeof TASK_CARD_DENSITIES)[number];

const TASK_CARD_CUSTOM_PRESENTATIONS = ['hidden', 'text', 'tag'] as const;
export type TaskCardCustomPresentation = (typeof TASK_CARD_CUSTOM_PRESENTATIONS)[number];

const MAX_CUSTOM_FIELDS = 16;
const CUSTOM_FIELD_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;

export interface TaskCardFieldPlacement {
  field: TaskCardFieldId;
  /** Скрыто глазом. Вид при этом сохраняется. */
  hidden?: boolean;
  /**
   * Оставлять поле, когда зона слота спрятана планом коротких карточек.
   * Явное `false` — не оставлять (важно для ключа с default `true`).
   */
  keepWhenSlotHidden?: boolean;
  /** Порядок внутри слота. Меньше — левее. */
  order: number;
  presentation: TaskCardPresentation;
  slot: TaskCardSlotId;
}

/** Поле трекера вне встроенного набора. `fieldId` — ключ поля, как в трекере. */
export interface TaskCardCustomFieldPlacement {
  fieldId: string;
  hidden?: boolean;
  /** Как у встроенного поля: исключение из hideEyebrow / hideTitleLead / hideFooter. */
  keepWhenSlotHidden?: boolean;
  label: string;
  /** Порядок внутри слота, общий со встроенными полями. */
  order: number;
  presentation: TaskCardCustomPresentation;
  slot: TaskCardSlotId;
  /** Короткое имя значения списка. Ключ — текст из трекера. */
  valueLabels?: Record<string, string>;
}

export const TASK_CARD_HIDE_WHENS = ['underThree', 'one', 'never'] as const;

export type TaskCardHideWhen = (typeof TASK_CARD_HIDE_WHENS)[number];

export interface TaskCardSlotLayout {
  customPlacements: TaskCardCustomFieldPlacement[];
  /** Когда прятать шапку. */
  hideEyebrow: TaskCardHideWhen;
  /** Когда прятать подвал и правый край подвала. */
  hideFooter: TaskCardHideWhen;
  /** Когда прятать ряд перед названием. */
  hideTitleLead: TaskCardHideWhen;
  placements: TaskCardFieldPlacement[];
}

export interface ResolvedTaskCardSlotItem {
  customFieldId?: string;
  field: TaskCardFieldId | 'custom';
  /** Подпись поля трекера. Пустая строка — на карточке только значение. */
  label?: string;
  presentation: Exclude<TaskCardPresentation, 'hidden'>;
  valueLabels?: Record<string, string>;
}

export type ResolvedTaskCardSlots = Record<TaskCardSlotId, ResolvedTaskCardSlotItem[]>;

const FIELD_PRESENTATIONS: Record<TaskCardFieldId, readonly TaskCardPresentation[]> = {
  assignee: ['hidden', 'tag', 'text'],
  estimate: ['hidden', 'text', 'tag'],
  key: ['hidden', 'link', 'text'],
  parent: ['hidden', 'text'],
  priority: ['hidden', 'icon', 'text', 'tag'],
  status: ['hidden', 'tag', 'dot', 'text'],
  type: ['hidden', 'icon', 'text', 'tag'],
};

const NOTE_KINDS = new Set<Task['localDraftKind']>(['comment', 'diagram', 'image', 'widget']);
const TRACKER_META_FIELDS: readonly TaskCardFieldId[] = [
  'key',
  'priority',
  'type',
  'status',
  'estimate',
];
const LOCAL_TITLE_FIELDS: readonly TaskCardFieldId[] = ['key', 'priority', 'type'];

const DEFAULT_PLACEMENT_BY_FIELD: Record<
  TaskCardFieldId,
  Pick<TaskCardFieldPlacement, 'keepWhenSlotHidden' | 'presentation' | 'slot'>
> = {
  assignee: { presentation: 'tag', slot: 'footerEnd' },
  estimate: { presentation: 'text', slot: 'footer' },
  key: { keepWhenSlotHidden: true, presentation: 'link', slot: 'titleLead' },
  parent: { presentation: 'text', slot: 'eyebrow' },
  priority: { presentation: 'icon', slot: 'titleLead' },
  status: { presentation: 'tag', slot: 'footer' },
  type: { presentation: 'icon', slot: 'titleLead' },
};

export function taskCardFieldPresentations(field: TaskCardFieldId): readonly TaskCardPresentation[] {
  return FIELD_PRESENTATIONS[field];
}

export function defaultTaskCardSlotLayout(): TaskCardSlotLayout {
  return {
    customPlacements: [],
    hideEyebrow: 'one',
    hideFooter: 'underThree',
    hideTitleLead: 'one',
    placements: TASK_CARD_FIELD_IDS.map((field, order) => ({
      field,
      order,
      ...DEFAULT_PLACEMENT_BY_FIELD[field],
    })),
  };
}

export function taskCardDensityFromDuration(displayDuration: number | undefined): TaskCardDensity {
  if (displayDuration === undefined || displayDuration >= 3) {
    return 'regular';
  }
  if (displayDuration <= 1) {
    return 'compact';
  }
  return 'narrow';
}

function emptyTaskCardSlots(): ResolvedTaskCardSlots {
  return { eyebrow: [], footer: [], footerEnd: [], titleLead: [] };
}

/** Заметки, фото, схемы, виджеты и черновик-плюсик не показывают трекерные поля. Локальная задача прячет ключ, тип и приоритет. */
export function taskCardFieldsSuppressedByKind(
  task: Pick<Task, 'isLocalTask' | 'localDraftKind'>
): TaskCardFieldId[] {
  const noteOrChooser = NOTE_KINDS.has(task.localDraftKind) || isChooserDraft(task);
  if (noteOrChooser) {
    return [...TRACKER_META_FIELDS];
  }
  if (task.isLocalTask === true) {
    return [...LOCAL_TITLE_FIELDS];
  }
  return [];
}

interface ResolveTaskCardSlotsInput {
  customFieldValues?: Readonly<Record<string, string>>;
  density: TaskCardDensity;
  hasAssignee: boolean;
  hasEstimate: boolean;
  hasKey: boolean;
  hasParent: boolean;
  hasPriority: boolean;
  hasStatus: boolean;
  hasType: boolean;
  layout: TaskCardSlotLayout;
  suppressFields?: readonly TaskCardFieldId[];
}

export function resolveTaskCardSlots(input: ResolveTaskCardSlotsInput): ResolvedTaskCardSlots {
  const layout = normalizeTaskCardSlotLayout(input.layout);
  const suppressed = new Set(input.suppressFields ?? []);
  const pending: { item: ResolvedTaskCardSlotItem; order: number; slot: TaskCardSlotId }[] = [];
  for (const placement of layout.placements) {
    const item = resolvePlacementItem(placement, input, suppressed);
    if (item) {
      pending.push({ item: toResolvedItem(item), order: placement.order, slot: item.slot });
    }
  }
  for (const placement of layout.customPlacements) {
    const item = resolveCustomPlacement(placement, input.customFieldValues);
    if (item) {
      pending.push({ item: toResolvedItem(item), order: placement.order, slot: item.slot });
    }
  }
  pending.sort((left, right) => left.order - right.order);

  const resolved = emptyTaskCardSlots();
  for (const entry of pending) {
    resolved[entry.slot].push(entry.item);
  }

  return applyTaskCardSlotDensity(layout, input.density, resolved);
}

export function layoutFromVisibility(
  fields: SwimlaneCardFieldsVisibility | undefined
): TaskCardSlotLayout {
  const layout = defaultTaskCardSlotLayout();
  layout.placements = layout.placements.map((placement) =>
    visibilityShowsField(fields, placement.field)
      ? placement
      : { ...placement, hidden: true }
  );
  return layout;
}

export function visibilityFromLayout(layout: TaskCardSlotLayout): SwimlaneCardFieldsVisibility {
  const normalized = normalizeTaskCardSlotLayout(layout);
  return {
    showEstimates: fieldIsShown(normalized, 'estimate'),
    showKey: fieldIsShown(normalized, 'key'),
    showParent: fieldIsShown(normalized, 'parent'),
    showPriority: fieldIsShown(normalized, 'priority'),
    showStatus: fieldIsShown(normalized, 'status'),
    showType: fieldIsShown(normalized, 'type'),
  };
}

/** Дополнительная высота строки, если над заголовком что-то рисуется. */
export function taskCardLayoutReservesEyebrow(layout: TaskCardSlotLayout): boolean {
  const normalized = normalizeTaskCardSlotLayout(layout);
  const builtin = normalized.placements.some(
    (placement) => placement.slot === 'eyebrow' && isShownPlacement(placement)
  );
  if (builtin) {
    return true;
  }
  return normalized.customPlacements.some(
    (placement) => placement.slot === 'eyebrow' && isShownCustomPlacement(placement)
  );
}

export function normalizeTaskCardSlotLayout(value: unknown): TaskCardSlotLayout {
  const defaults = defaultTaskCardSlotLayout();
  const record = isRecord(value) ? value : {};
  const storedPlacements = Array.isArray(record.placements) ? record.placements : [];
  const storedCustom = Array.isArray(record.customPlacements) ? record.customPlacements : [];

  return {
    customPlacements: readCustomPlacements(storedCustom),
    hideEyebrow: readHideWhen(
      record,
      'hideEyebrow',
      'hideEyebrowOnCompact',
      'hideLeadMetaOnCompact',
      'one',
      defaults.hideEyebrow
    ),
    hideFooter: readHideWhen(
      record,
      'hideFooter',
      'hideFooterUntilWide',
      'collapseFooterUntilWide',
      'underThree',
      defaults.hideFooter
    ),
    hideTitleLead: readHideWhen(
      record,
      'hideTitleLead',
      'hideTitleLeadOnCompact',
      'hideLeadMetaOnCompact',
      'one',
      defaults.hideTitleLead
    ),
    placements: defaults.placements.map((fallback) => readPlacement(storedPlacements, fallback)),
  };
}

function readHideWhen(
  record: Record<string, unknown>,
  key: string,
  legacyKey: string,
  olderKey: string,
  whenTrue: TaskCardHideWhen,
  fallback: TaskCardHideWhen
): TaskCardHideWhen {
  if (isTaskCardHideWhen(record[key])) {
    return record[key];
  }
  const legacy = booleanHideWhen(record[legacyKey], whenTrue);
  if (legacy) {
    return legacy;
  }
  return booleanHideWhen(record[olderKey], whenTrue) ?? fallback;
}

export function taskCardSlotLayoutsEqual(left: TaskCardSlotLayout, right: TaskCardSlotLayout): boolean {
  return JSON.stringify(normalizeTaskCardSlotLayout(left)) === JSON.stringify(normalizeTaskCardSlotLayout(right));
}

function isChooserDraft(task: Pick<Task, 'isLocalTask' | 'localDraftKind'>): boolean {
  return task.isLocalTask === true && task.localDraftKind === undefined;
}

function visibilityShowsField(
  fields: SwimlaneCardFieldsVisibility | undefined,
  field: TaskCardFieldId
): boolean {
  if (!fields) {
    return true;
  }
  switch (field) {
    case 'assignee':
      return true;
    case 'estimate':
      return fields.showEstimates;
    case 'key':
      return fields.showKey;
    case 'parent':
      return fields.showParent;
    case 'priority':
      return fields.showPriority;
    case 'status':
      return fields.showStatus;
    case 'type':
      return fields.showType;
    default:
      return true;
  }
}

function fieldIsShown(layout: TaskCardSlotLayout, field: TaskCardFieldId): boolean {
  const placement = layout.placements.find((item) => item.field === field);
  return placement !== undefined && isShownPlacement(placement);
}

function isShownPlacement(placement: TaskCardFieldPlacement): boolean {
  return placement.hidden !== true && placement.presentation !== 'hidden';
}

function isShownCustomPlacement(placement: TaskCardCustomFieldPlacement): boolean {
  return placement.hidden !== true && placement.presentation !== 'hidden';
}

interface ResolvedPlacement {
  customFieldId?: string;
  field: TaskCardFieldId | 'custom';
  label?: string;
  presentation: Exclude<TaskCardPresentation, 'hidden'>;
  slot: TaskCardSlotId;
  valueLabels?: Record<string, string>;
}

function toResolvedItem(item: ResolvedPlacement): ResolvedTaskCardSlotItem {
  return {
    ...(item.customFieldId ? { customFieldId: item.customFieldId } : {}),
    ...(item.label !== undefined ? { label: item.label } : {}),
    ...(item.valueLabels ? { valueLabels: item.valueLabels } : {}),
    field: item.field,
    presentation: item.presentation,
  };
}

function resolvePlacementItem(
  placement: TaskCardFieldPlacement,
  input: ResolveTaskCardSlotsInput,
  suppressed: Set<TaskCardFieldId>
): ResolvedPlacement | null {
  if (
    suppressed.has(placement.field) ||
    !fieldHasData(placement.field, input) ||
    !isShownPlacement(placement) ||
    placement.presentation === 'hidden'
  ) {
    return null;
  }
  return {
    field: placement.field,
    presentation: placement.presentation,
    slot: placement.slot,
  };
}

function resolveCustomPlacement(
  placement: TaskCardCustomFieldPlacement,
  values: Readonly<Record<string, string>> | undefined
): ResolvedPlacement | null {
  if (!isShownCustomPlacement(placement) || placement.presentation === 'hidden' || !values?.[placement.fieldId]) {
    return null;
  }
  return {
    customFieldId: placement.fieldId,
    field: 'custom',
    label: placement.label,
    presentation: placement.presentation,
    slot: placement.slot,
    ...(placement.valueLabels ? { valueLabels: placement.valueLabels } : {}),
  };
}

function fieldHasData(field: TaskCardFieldId, input: ResolveTaskCardSlotsInput): boolean {
  switch (field) {
    case 'assignee':
      return input.hasAssignee;
    case 'estimate':
      return input.hasEstimate;
    case 'key':
      return input.hasKey;
    case 'parent':
      return input.hasParent;
    case 'priority':
      return input.hasPriority;
    case 'status':
      return input.hasStatus;
    case 'type':
      return input.hasType;
    default:
      return false;
  }
}

function readPlacement(stored: unknown[], fallback: TaskCardFieldPlacement): TaskCardFieldPlacement {
  const match = stored.find((entry) => isRecord(entry) && entry.field === fallback.field);
  if (!isRecord(match)) {
    return { ...fallback };
  }
  const storedPresentation = isAllowedPresentation(fallback.field, match.presentation)
    ? match.presentation
    : fallback.presentation;
  const hidden = match.hidden === true || storedPresentation === 'hidden';
  return {
    field: fallback.field,
    ...(hidden ? { hidden: true } : {}),
    ...keepWhenSlotHiddenSpread(readKeepWhenSlotHidden(match.keepWhenSlotHidden, fallback.keepWhenSlotHidden)),
    order: readFiniteOrder(match.order, fallback.order),
    presentation: storedPresentation === 'hidden' ? fallback.presentation : storedPresentation,
    slot: isSlot(match.slot) ? match.slot : fallback.slot,
  };
}

function readCustomPlacements(stored: unknown[]): TaskCardCustomFieldPlacement[] {
  const placements: TaskCardCustomFieldPlacement[] = [];
  for (const entry of stored) {
    if (placements.length >= MAX_CUSTOM_FIELDS) {
      break;
    }
    const placement = readOneCustomPlacement(entry, placements);
    if (placement) {
      placements.push(placement);
    }
  }
  return placements;
}

function readOneCustomPlacement(
  entry: unknown,
  existing: readonly TaskCardCustomFieldPlacement[]
): TaskCardCustomFieldPlacement | null {
  if (!isRecord(entry)) {
    return null;
  }
  const fieldId = normalizeCustomFieldId(entry.fieldId);
  if (!fieldId || existing.some((placement) => placement.fieldId === fieldId)) {
    return null;
  }
  const storedPresentation = isCustomPresentation(entry.presentation) ? entry.presentation : 'text';
  const hidden = entry.hidden === true || storedPresentation === 'hidden';
  const valueLabels = readTaskCardValueLabels(entry.valueLabels);
  return {
    fieldId,
    ...(hidden ? { hidden: true } : {}),
    ...keepWhenSlotHiddenSpread(readKeepWhenSlotHidden(entry.keepWhenSlotHidden, undefined)),
    label: normalizeCustomFieldLabel(entry.label, fieldId),
    order: readFiniteOrder(entry.order, 1000 + existing.length),
    ...(valueLabels ? { valueLabels } : {}),
    presentation: storedPresentation === 'hidden' ? 'text' : storedPresentation,
    slot: isSlot(entry.slot) ? entry.slot : 'footer',
  };
}

function readFiniteOrder(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeCustomFieldId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const fieldId = value.trim();
  return CUSTOM_FIELD_ID_PATTERN.test(fieldId) ? fieldId : null;
}

function normalizeCustomFieldLabel(value: unknown, fieldId: string): string {
  if (typeof value !== 'string') {
    return fieldId;
  }
  return value.slice(0, 80);
}

function isCustomPresentation(value: unknown): value is TaskCardCustomPresentation {
  return TASK_CARD_CUSTOM_PRESENTATIONS.some((presentation) => presentation === value);
}

function isTaskCardPresentation(value: unknown): value is TaskCardPresentation {
  return TASK_CARD_PRESENTATIONS.some((presentation) => presentation === value);
}

function isAllowedPresentation(field: TaskCardFieldId, value: unknown): value is TaskCardPresentation {
  return isTaskCardPresentation(value) && FIELD_PRESENTATIONS[field].some((presentation) => presentation === value);
}

function isSlot(value: unknown): value is TaskCardSlotId {
  return TASK_CARD_SLOT_IDS.some((slot) => slot === value);
}

function isTaskCardHideWhen(value: unknown): value is TaskCardHideWhen {
  return TASK_CARD_HIDE_WHENS.some((item) => item === value);
}

function booleanHideWhen(value: unknown, whenTrue: TaskCardHideWhen): TaskCardHideWhen | null {
  if (typeof value !== 'boolean') {
    return null;
  }
  return value ? whenTrue : 'never';
}

