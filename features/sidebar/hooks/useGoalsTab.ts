/**
 * Хук для управления логикой редактирования целей в GoalsTab
 */

import type { ChecklistItem } from '@/types/tracker';

import { useEffect, useState, useCallback } from 'react';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/contexts/LanguageContext';

import { removeGoalIdsFromDeletingMap, saveGoalEdit } from './goalsTabHelpers';

interface UseGoalsTabProps {
  canEdit: boolean;
  checklistItems: ChecklistItem[];
  onAddGoal?: (text: string) => Promise<void>;
  onDeleteGoal?: (itemId: string) => Promise<void>;
  onEditGoal?: (itemId: string, text: string) => Promise<void>;
}

export function useGoalsTab({
  canEdit,
  checklistItems,
  onAddGoal,
  onDeleteGoal,
  onEditGoal,
}: UseGoalsTabProps) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [newGoalId, setNewGoalId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingItems, setDeletingItems] = useState<Map<string, ChecklistItem>>(new Map());
  const { confirm, DialogComponent } = useConfirmDialog();

  // Очищаем удаляемые элементы через небольшую задержку после их исчезновения из списка
  useEffect(() => {
    const currentIds = new Set(checklistItems.map(item => item.id));
    const toRemove: string[] = [];

    for (const [id] of deletingItems) {
      if (!currentIds.has(id)) {
        toRemove.push(id);
      }
    }

    if (toRemove.length > 0) {
      const timeout = setTimeout(() => {
        setDeletingItems((prev) => removeGoalIdsFromDeletingMap(prev, toRemove));
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [checklistItems, deletingItems]);

  const handleStartEdit = useCallback((item: ChecklistItem) => {
    if (!canEdit) return;
    if (editingId && editingId !== item.id) return;
    setEditingId(item.id);
    setEditingText(item.text);
  }, [canEdit, editingId]);

  const handleCancelEdit = useCallback(() => {
    if (newGoalId && editingId === newGoalId) {
      setNewGoalId(null);
    }
    setEditingId(null);
    setEditingText('');
  }, [newGoalId, editingId]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    await saveGoalEdit({
      editingId,
      editingText,
      handleCancelEdit,
      newGoalId,
      onAddGoal,
      onEditGoal,
      setIsAdding,
      setEditingId,
      setEditingText,
      setNewGoalId,
    });
  }, [editingId, editingText, newGoalId, onAddGoal, onEditGoal, handleCancelEdit]);

  const handleAddNewGoal = useCallback(() => {
    if (!canEdit) return;
    if (editingId) return;
    const tempId = `new-${Date.now()}`;
    setEditingText('');
    setNewGoalId(tempId);
    setEditingId(tempId);
  }, [canEdit, editingId]);

  const handleDeleteGoal = useCallback(async (itemId: string) => {
    if (!canEdit || !onDeleteGoal) return;
    const confirmed = await confirm(t('sidebar.goalsTab.deleteGoalConfirm'), {
      title: t('sidebar.goalsTab.deleteGoalTitle'),
      variant: 'destructive',
    });
    if (!confirmed) return;

    const itemToDelete = checklistItems.find(item => item.id === itemId);
    if (itemToDelete) {
      setDeletingItems(prev => new Map(prev).set(itemId, itemToDelete));
    }

    try {
      await onDeleteGoal(itemId);
    } catch (err) {
      console.error('Failed to delete goal:', err);
      setDeletingItems(prev => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [canEdit, onDeleteGoal, checklistItems, confirm, t]);

  return {
    editingId,
    editingText,
    setEditingText,
    newGoalId,
    isAdding,
    deletingItems,
    DialogComponent,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleAddNewGoal,
    handleDeleteGoal,
  };
}

