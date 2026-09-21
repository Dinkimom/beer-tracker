import type { ChecklistItem } from '@/types/tracker';

export function removeGoalIdsFromDeletingMap(
  prev: Map<string, ChecklistItem>,
  ids: string[]
): Map<string, ChecklistItem> {
  const next = new Map(prev);
  for (const id of ids) {
    next.delete(id);
  }
  return next;
}

async function saveNewGoalEdit(args: {
  editingText: string;
  onAddGoal: (text: string) => Promise<void>;
  setEditingId: (value: string | null) => void;
  setEditingText: (value: string) => void;
  setIsAdding: (value: boolean) => void;
  setNewGoalId: (value: string | null) => void;
}): Promise<void> {
  args.setIsAdding(true);
  const addPromise = args.onAddGoal(args.editingText.trim());
  args.setNewGoalId(null);
  args.setEditingId(null);
  args.setEditingText('');
  await addPromise;
}

async function saveExistingGoalEdit(args: {
  editingId: string;
  editingText: string;
  onEditGoal: (itemId: string, text: string) => Promise<void>;
  setEditingId: (value: string | null) => void;
  setEditingText: (value: string) => void;
}): Promise<void> {
  await args.onEditGoal(args.editingId, args.editingText.trim());
  args.setEditingId(null);
  args.setEditingText('');
}

async function routeGoalSave(args: {
  editingId: string;
  editingText: string;
  newGoalId: string | null;
  onAddGoal?: (text: string) => Promise<void>;
  onEditGoal?: (itemId: string, text: string) => Promise<void>;
  setEditingId: (value: string | null) => void;
  setEditingText: (value: string) => void;
  setIsAdding: (value: boolean) => void;
  setNewGoalId: (value: string | null) => void;
}): Promise<void> {
  const isNewGoal = args.newGoalId != null && args.editingId === args.newGoalId;
  if (isNewGoal) {
    if (!args.onAddGoal) return;
    await saveNewGoalEdit({
      editingText: args.editingText,
      onAddGoal: args.onAddGoal,
      setEditingId: args.setEditingId,
      setEditingText: args.setEditingText,
      setIsAdding: args.setIsAdding,
      setNewGoalId: args.setNewGoalId,
    });
    return;
  }

  if (!args.onEditGoal) return;
  await saveExistingGoalEdit({
    editingId: args.editingId,
    editingText: args.editingText,
    onEditGoal: args.onEditGoal,
    setEditingId: args.setEditingId,
    setEditingText: args.setEditingText,
  });
}

export async function saveGoalEdit(args: {
  editingId: string;
  editingText: string;
  handleCancelEdit: () => void;
  newGoalId: string | null;
  onAddGoal?: (text: string) => Promise<void>;
  onEditGoal?: (itemId: string, text: string) => Promise<void>;
  setIsAdding: (value: boolean) => void;
  setEditingId: (value: string | null) => void;
  setEditingText: (value: string) => void;
  setNewGoalId: (value: string | null) => void;
}): Promise<void> {
  if (!args.editingText.trim()) {
    args.handleCancelEdit();
    return;
  }

  try {
    await routeGoalSave(args);
  } catch (err) {
    console.error('Failed to save:', err);
  } finally {
    args.setIsAdding(false);
  }
}
