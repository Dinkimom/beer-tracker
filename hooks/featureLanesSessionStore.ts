import { fetchFeatureLanes, saveFeatureLanes } from '@/lib/beerTrackerApi';
import {
  emptyFeatureLanesDocument,
  type FeatureLanesDocument,
} from '@/lib/sprints/featureLanesDocument';
import { DELAYS } from '@/utils/constants';

interface FeatureLanesSessionSlot {
  dirty: boolean;
  document: FeatureLanesDocument | undefined;
  listeners: Set<() => void>;
  loaded: boolean;
  saveTimer: ReturnType<typeof setTimeout> | null;
}

const inflightLoad = new Map<number, Promise<void>>();
const slots = new Map<number, FeatureLanesSessionSlot>();

function getOrCreateSlot(sprintId: number): FeatureLanesSessionSlot {
  const existing = slots.get(sprintId);
  if (existing) {
    return existing;
  }
  const created: FeatureLanesSessionSlot = {
    dirty: false,
    document: undefined,
    listeners: new Set(),
    loaded: false,
    saveTimer: null,
  };
  slots.set(sprintId, created);
  return created;
}

function emit(slot: FeatureLanesSessionSlot): void {
  for (const listener of slot.listeners) {
    listener();
  }
}

function scheduleSave(sprintId: number, slot: FeatureLanesSessionSlot): void {
  if (!slot.loaded) {
    return;
  }
  if (slot.saveTimer) {
    clearTimeout(slot.saveTimer);
  }
  slot.saveTimer = setTimeout(() => {
    slot.saveTimer = null;
    const toSave = slot.document;
    if (!toSave) {
      return;
    }
    saveFeatureLanes(sprintId, toSave)
      .then(() => {
        if (slot.document === toSave) {
          slot.dirty = false;
        }
      })
      .catch((error: unknown) => {
        console.error('Error saving feature lanes:', error);
      });
  }, DELAYS.DEBOUNCE);
}

export function subscribeFeatureLanesSession(sprintId: number, listener: () => void): () => void {
  const slot = getOrCreateSlot(sprintId);
  slot.listeners.add(listener);
  return () => {
    slot.listeners.delete(listener);
  };
}

export function getFeatureLanesSession(sprintId: number): FeatureLanesDocument | undefined {
  return slots.get(sprintId)?.document;
}

export function getFeatureLanesSessionLoaded(sprintId: number): boolean {
  return slots.get(sprintId)?.loaded === true;
}

export function patchFeatureLanesSession(
  sprintId: number,
  updater: (prev: FeatureLanesDocument | undefined) => FeatureLanesDocument
): void {
  const slot = getOrCreateSlot(sprintId);
  slot.document = updater(slot.document);
  slot.dirty = true;
  emit(slot);
  scheduleSave(sprintId, slot);
}

export function ensureFeatureLanesSessionLoaded(sprintId: number): void {
  const slot = getOrCreateSlot(sprintId);
  if (slot.loaded || inflightLoad.has(sprintId)) {
    return;
  }
  const load = fetchFeatureLanes(sprintId)
    .then((document) => {
      slot.loaded = true;
      if (slot.dirty) {
        scheduleSave(sprintId, slot);
      } else {
        slot.document = document ?? emptyFeatureLanesDocument();
      }
      emit(slot);
    })
    .catch((error: unknown) => {
      console.error('Error loading feature lanes:', error);
      slot.loaded = true;
      if (slot.dirty) {
        scheduleSave(sprintId, slot);
      } else {
        slot.document = emptyFeatureLanesDocument();
      }
      emit(slot);
    })
    .finally(() => {
      inflightLoad.delete(sprintId);
    });
  inflightLoad.set(sprintId, load);
}

export function resetFeatureLanesSessionForTests(): void {
  for (const slot of slots.values()) {
    if (slot.saveTimer) {
      clearTimeout(slot.saveTimer);
    }
  }
  inflightLoad.clear();
  slots.clear();
}
