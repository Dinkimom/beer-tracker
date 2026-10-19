import type {
  ResolvedTaskCardSlotItem,
  ResolvedTaskCardSlots,
  TaskCardDensity,
  TaskCardHideWhen,
  TaskCardSlotId,
  TaskCardSlotLayout,
} from './taskCardSlots';

const SLOT_IDS: readonly TaskCardSlotId[] = ['eyebrow', 'titleLead', 'footer', 'footerEnd'];

/** Явное true/false из storage; иначе fallback (для ключа — default true). */
export function readKeepWhenSlotHidden(
  value: unknown,
  fallback: boolean | undefined
): boolean | undefined {
  if (value === true || value === false) {
    return value;
  }
  return fallback;
}

export function keepWhenSlotHiddenSpread(
  value: boolean | undefined
): { keepWhenSlotHidden?: boolean } {
  if (value === true) {
    return { keepWhenSlotHidden: true };
  }
  if (value === false) {
    return { keepWhenSlotHidden: false };
  }
  return {};
}

export function applyTaskCardSlotDensity(
  layout: TaskCardSlotLayout,
  density: TaskCardDensity,
  resolved: ResolvedTaskCardSlots
): ResolvedTaskCardSlots {
  const next = emptySlots();
  for (const slot of SLOT_IDS) {
    const slotVisible = slotVisibleAtDensity(layout, density, slot);
    next[slot] = resolved[slot].filter(
      (item) => slotVisible || itemKeepsWhenSlotHidden(layout, item)
    );
  }
  return next;
}

function emptySlots(): ResolvedTaskCardSlots {
  return { eyebrow: [], footer: [], footerEnd: [], titleLead: [] };
}

function slotVisibleAtDensity(
  layout: TaskCardSlotLayout,
  density: TaskCardDensity,
  slot: TaskCardSlotId
): boolean {
  if (slot === 'eyebrow') {
    return !partHidden(layout.hideEyebrow, density);
  }
  if (slot === 'titleLead') {
    return !partHidden(layout.hideTitleLead, density);
  }
  if (slot === 'footer' || slot === 'footerEnd') {
    return !partHidden(layout.hideFooter, density);
  }
  return true;
}

function itemKeepsWhenSlotHidden(
  layout: TaskCardSlotLayout,
  item: ResolvedTaskCardSlotItem
): boolean {
  if (item.field === 'custom') {
    const placement = layout.customPlacements.find((entry) => entry.fieldId === item.customFieldId);
    return placement?.keepWhenSlotHidden === true;
  }
  const placement = layout.placements.find((entry) => entry.field === item.field);
  return placement?.keepWhenSlotHidden === true;
}

function partHidden(when: TaskCardHideWhen, density: TaskCardDensity): boolean {
  if (when === 'never') {
    return false;
  }
  if (when === 'one') {
    return density === 'compact';
  }
  return density !== 'regular';
}
