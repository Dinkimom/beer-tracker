import type {
  TaskCardCustomFieldPlacement,
  TaskCardCustomPresentation,
  TaskCardFieldId,
  TaskCardFieldPlacement,
  TaskCardPresentation,
  TaskCardSlotId,
  TaskCardSlotLayout,
} from './taskCardSlots';

import { keepWhenSlotHiddenSpread } from './taskCardSlotDensity';
import {
  normalizeCustomFieldId,
  normalizeTaskCardSlotLayout,
  TASK_CARD_SLOT_IDS,
  taskCardFieldPresentations,
} from './taskCardSlots';
import { mergeTaskCardValueLabel } from './taskCardValueLabels';

const MAX_CUSTOM_FIELDS = 16;

export function addTaskCardCustomField(
  layout: TaskCardSlotLayout,
  input: { fieldId: string; label?: string }
): TaskCardSlotLayout {
  const normalized = normalizeTaskCardSlotLayout(layout);
  const fieldId = normalizeCustomFieldId(input.fieldId);
  if (!fieldId || normalized.customPlacements.some((placement) => placement.fieldId === fieldId)) {
    return normalized;
  }
  if (normalized.customPlacements.length >= MAX_CUSTOM_FIELDS) {
    return normalized;
  }
  return {
    ...normalized,
    customPlacements: [
      ...normalized.customPlacements,
      {
        fieldId,
        label: normalizeCustomFieldLabel(input.label, fieldId),
        order: nextSlotOrder(normalized),
        presentation: 'text',
        slot: 'footer',
      },
    ],
  };
}

export function updateTaskCardCustomField(
  layout: TaskCardSlotLayout,
  fieldId: string,
  patch: {
    keepWhenSlotHidden?: boolean;
    label?: string;
    presentation?: TaskCardCustomPresentation;
    slot?: TaskCardSlotId;
    valueLabel?: { label: string; option: string };
  }
): TaskCardSlotLayout {
  const normalized = normalizeTaskCardSlotLayout(layout);
  return {
    ...normalized,
    customPlacements: normalized.customPlacements.map((placement) =>
      placement.fieldId === fieldId ? applyCustomFieldPatch(placement, fieldId, patch) : placement
    ),
  };
}

export function removeTaskCardCustomField(
  layout: TaskCardSlotLayout,
  fieldId: string
): TaskCardSlotLayout {
  const normalized = normalizeTaskCardSlotLayout(layout);
  return {
    ...normalized,
    customPlacements: normalized.customPlacements.filter((placement) => placement.fieldId !== fieldId),
  };
}

/** Переносит поле в другой слот и оставляет вид и скрытие как есть. */
export function moveTaskCardField(
  layout: TaskCardSlotLayout,
  field: TaskCardFieldId,
  slot: TaskCardSlotId
): TaskCardSlotLayout {
  return updateTaskCardFieldPlacement(layout, field, { slot });
}

/** Глаз: спрятать или показать поле, не меняя вид. */
export function toggleTaskCardFieldHidden(
  layout: TaskCardSlotLayout,
  field: TaskCardFieldId
): TaskCardSlotLayout {
  const normalized = normalizeTaskCardSlotLayout(layout);
  return {
    ...normalized,
    placements: normalized.placements.map((placement) =>
      placement.field === field ? toggleHiddenFlag(placement) : placement
    ),
  };
}

/** Глаз для поля трекера. */
export function toggleTaskCardCustomFieldHidden(
  layout: TaskCardSlotLayout,
  fieldId: string
): TaskCardSlotLayout {
  const normalized = normalizeTaskCardSlotLayout(layout);
  return {
    ...normalized,
    customPlacements: normalized.customPlacements.map((placement) =>
      placement.fieldId === fieldId ? toggleHiddenFlag(placement) : placement
    ),
  };
}

/** Группы id `builtin:field` / `custom:fieldId` в порядке слота. */
export function taskCardSlotItemGroups(layout: TaskCardSlotLayout): Record<TaskCardSlotId, string[]> {
  const normalized = normalizeTaskCardSlotLayout(layout);
  const rows = [
    ...normalized.placements.map((placement) => ({
      id: `builtin:${placement.field}`,
      order: placement.order,
      slot: placement.slot,
    })),
    ...normalized.customPlacements.map((placement) => ({
      id: `custom:${placement.fieldId}`,
      order: placement.order,
      slot: placement.slot,
    })),
  ].sort((left, right) => left.order - right.order);
  const groups = emptyGroups();
  for (const row of rows) {
    groups[row.slot].push(row.id);
  }
  return groups;
}

/** Записывает слот и порядок из групп. Поля вне групп остаются на месте. */
export function arrangeTaskCardSlots(
  layout: TaskCardSlotLayout,
  groups: Record<TaskCardSlotId, readonly string[]>
): TaskCardSlotLayout {
  const normalized = normalizeTaskCardSlotLayout(layout);
  const index = indexGroups(groups);
  return normalizeTaskCardSlotLayout({
    ...normalized,
    customPlacements: normalized.customPlacements.map((placement) =>
      applyArranged(placement, index.get(`custom:${placement.fieldId}`))
    ),
    placements: normalized.placements.map((placement) =>
      applyArranged(placement, index.get(`builtin:${placement.field}`))
    ),
  });
}

/** Перестановка внутри слота или перенос в другой. `null`, если порядок не изменился. */
export function moveTaskCardSlotItem(
  groups: Record<TaskCardSlotId, readonly string[]>,
  activeId: string,
  overId: string
): Record<TaskCardSlotId, string[]> | null {
  const from = slotOfItem(groups, activeId);
  const to = slotOfTarget(groups, overId);
  if (!from || !to) {
    return null;
  }
  if (from === to) {
    return reorderWithinSlot(groups, from, activeId, overId);
  }
  return moveAcrossSlots(groups, from, to, activeId, overId);
}

export function taskCardSlotItemChangesSlot(
  groups: Record<TaskCardSlotId, readonly string[]>,
  activeId: string,
  overId: string
): boolean {
  const from = slotOfItem(groups, activeId);
  const to = slotOfTarget(groups, overId);
  return from !== null && to !== null && from !== to;
}

export function updateTaskCardFieldPlacement(
  layout: TaskCardSlotLayout,
  field: TaskCardFieldId,
  patch: { keepWhenSlotHidden?: boolean; presentation?: TaskCardPresentation; slot?: TaskCardSlotId }
): TaskCardSlotLayout {
  const normalized = normalizeTaskCardSlotLayout(layout);
  return normalizeTaskCardSlotLayout({
    ...normalized,
    placements: normalized.placements.map((placement) =>
      placement.field === field ? applyFieldPatch(placement, patch) : placement
    ),
  });
}

function toggleHiddenFlag<T extends { hidden?: boolean }>(placement: T): T {
  if (placement.hidden) {
    const { hidden: _hidden, ...shown } = placement;
    return shown as T;
  }
  return { ...placement, hidden: true };
}

function applyFieldPatch(
  placement: TaskCardFieldPlacement,
  patch: { keepWhenSlotHidden?: boolean; presentation?: TaskCardPresentation; slot?: TaskCardSlotId }
): TaskCardFieldPlacement {
  const slot = patch.slot ?? placement.slot;
  const keepSpread = keepWhenSlotHiddenSpread(
    patch.keepWhenSlotHidden !== undefined ? patch.keepWhenSlotHidden : placement.keepWhenSlotHidden
  );
  if (patch.presentation === 'hidden') {
    return {
      field: placement.field,
      hidden: true,
      ...keepSpread,
      order: placement.order,
      presentation: shownPresentation(placement),
      slot,
    };
  }
  if (patch.presentation && isAllowedPresentation(placement.field, patch.presentation)) {
    return {
      field: placement.field,
      ...keepSpread,
      order: placement.order,
      presentation: patch.presentation,
      slot,
    };
  }
  return {
    field: placement.field,
    ...(placement.hidden ? { hidden: true } : {}),
    ...keepSpread,
    order: placement.order,
    presentation: shownPresentation(placement),
    slot,
  };
}

function nextValueLabels(
  placement: TaskCardCustomFieldPlacement,
  patch: { valueLabel?: { label: string; option: string } }
): Record<string, string> | undefined {
  if (!patch.valueLabel) {
    return placement.valueLabels;
  }
  return mergeTaskCardValueLabel(placement.valueLabels, patch.valueLabel.option, patch.valueLabel.label);
}

function finishCustomPlacement(
  placement: TaskCardCustomFieldPlacement,
  next: {
    hidden?: boolean;
    keepWhenSlotHidden?: boolean;
    label: string;
    presentation: TaskCardCustomPresentation;
    slot: TaskCardSlotId;
    valueLabels?: Record<string, string>;
  }
): TaskCardCustomFieldPlacement {
  return {
    fieldId: placement.fieldId,
    ...(next.hidden ? { hidden: true } : {}),
    ...keepWhenSlotHiddenSpread(next.keepWhenSlotHidden),
    label: next.label,
    order: placement.order,
    presentation: next.presentation,
    slot: next.slot,
    ...(next.valueLabels ? { valueLabels: next.valueLabels } : {}),
  };
}

function applyCustomFieldPatch(
  placement: TaskCardCustomFieldPlacement,
  fieldId: string,
  patch: {
    keepWhenSlotHidden?: boolean;
    label?: string;
    presentation?: TaskCardCustomPresentation;
    slot?: TaskCardSlotId;
    valueLabel?: { label: string; option: string };
  }
): TaskCardCustomFieldPlacement {
  const label = patch.label === undefined ? placement.label : normalizeCustomFieldLabel(patch.label, fieldId);
  const slot = patch.slot ?? placement.slot;
  const valueLabels = nextValueLabels(placement, patch);
  const keepWhenSlotHidden =
    patch.keepWhenSlotHidden !== undefined ? patch.keepWhenSlotHidden : placement.keepWhenSlotHidden;
  const shown = placement.presentation === 'hidden' ? 'text' : placement.presentation;
  if (patch.presentation === 'hidden') {
    return finishCustomPlacement(placement, {
      hidden: true,
      keepWhenSlotHidden,
      label,
      presentation: shown,
      slot,
      valueLabels,
    });
  }
  if (patch.presentation) {
    return finishCustomPlacement(placement, {
      keepWhenSlotHidden,
      label,
      presentation: patch.presentation,
      slot,
      valueLabels,
    });
  }
  return finishCustomPlacement(placement, {
    ...(placement.hidden ? { hidden: true } : {}),
    keepWhenSlotHidden,
    label,
    presentation: shown,
    slot,
    valueLabels,
  });
}

function nextSlotOrder(layout: TaskCardSlotLayout): number {
  const orders = [
    ...layout.placements.map((placement) => placement.order),
    ...layout.customPlacements.map((placement) => placement.order),
  ];
  return orders.reduce((max, order) => Math.max(max, order), -1) + 1;
}

function emptyGroups(): Record<TaskCardSlotId, string[]> {
  return { eyebrow: [], footer: [], footerEnd: [], titleLead: [] };
}

function applyArranged<T extends { order: number; slot: TaskCardSlotId }>(
  placement: T,
  arranged: { order: number; slot: TaskCardSlotId } | undefined
): T {
  if (!arranged) {
    return placement;
  }
  return { ...placement, order: arranged.order, slot: arranged.slot };
}

function indexGroups(
  groups: Record<TaskCardSlotId, readonly string[]>
): Map<string, { order: number; slot: TaskCardSlotId }> {
  const index = new Map<string, { order: number; slot: TaskCardSlotId }>();
  for (const slot of TASK_CARD_SLOT_IDS) {
    const ids = groups[slot];
    for (let order = 0; order < ids.length; order += 1) {
      const id = ids[order];
      if (id) {
        index.set(id, { order, slot });
      }
    }
  }
  return index;
}

function slotOfItem(groups: Record<TaskCardSlotId, readonly string[]>, itemId: string): TaskCardSlotId | null {
  for (const slot of TASK_CARD_SLOT_IDS) {
    if (groups[slot].includes(itemId)) {
      return slot;
    }
  }
  return null;
}

function slotOfTarget(groups: Record<TaskCardSlotId, readonly string[]>, overId: string): TaskCardSlotId | null {
  if (overId.startsWith('zone:')) {
    const slot = overId.slice('zone:'.length);
    return isKnownSlot(slot) ? slot : null;
  }
  return slotOfItem(groups, overId);
}

function isKnownSlot(value: string): value is TaskCardSlotId {
  return (TASK_CARD_SLOT_IDS as readonly string[]).includes(value);
}

function reorderWithinSlot(
  groups: Record<TaskCardSlotId, readonly string[]>,
  slot: TaskCardSlotId,
  activeId: string,
  overId: string
): Record<TaskCardSlotId, string[]> | null {
  if (overId.startsWith('zone:')) {
    return null;
  }
  const items = groups[slot];
  const oldIndex = items.indexOf(activeId);
  const newIndex = items.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return null;
  }
  const next = copyGroups(groups);
  next[slot] = moveArrayItem(items, oldIndex, newIndex);
  return next;
}

function moveAcrossSlots(
  groups: Record<TaskCardSlotId, readonly string[]>,
  from: TaskCardSlotId,
  to: TaskCardSlotId,
  activeId: string,
  overId: string
): Record<TaskCardSlotId, string[]> {
  const next = copyGroups(groups);
  next[from] = groups[from].filter((id) => id !== activeId);
  const destination = [...groups[to]];
  const overIndex = destination.indexOf(overId);
  destination.splice(overIndex === -1 ? destination.length : overIndex, 0, activeId);
  next[to] = destination;
  return next;
}

function copyGroups(groups: Record<TaskCardSlotId, readonly string[]>): Record<TaskCardSlotId, string[]> {
  return {
    eyebrow: [...groups.eyebrow],
    footer: [...groups.footer],
    footerEnd: [...groups.footerEnd],
    titleLead: [...groups.titleLead],
  };
}

function moveArrayItem(items: readonly string[], from: number, to: number): string[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) {
    return [...items];
  }
  next.splice(to, 0, item);
  return next;
}

function shownPresentation(placement: TaskCardFieldPlacement): TaskCardPresentation {
  if (placement.presentation !== 'hidden') {
    return placement.presentation;
  }
  return taskCardFieldPresentations(placement.field).find((item) => item !== 'hidden') ?? 'text';
}

function isAllowedPresentation(field: TaskCardFieldId, value: TaskCardPresentation): boolean {
  return taskCardFieldPresentations(field).some((presentation) => presentation === value);
}


function normalizeCustomFieldLabel(value: unknown, fieldId: string): string {
  if (typeof value !== 'string') {
    return fieldId;
  }
  return value.slice(0, 80);
}
