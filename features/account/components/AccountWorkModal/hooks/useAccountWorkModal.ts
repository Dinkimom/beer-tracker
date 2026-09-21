'use client';

/**
 * Хук для управления логикой AccountWorkModal
 */

import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';

interface UseAccountWorkModalProps {
  currentSprintId: number | null;
  isOpen: boolean;
  sprints: SprintListItem[];
  task: Task | null;
  onClose: () => void;
  onConfirm: (data: {
    burnedStoryPoints: number;
    burnedTestPoints: number;
    newTaskTitle: string;
    remainingStoryPoints: number;
    remainingTestPoints: number;
    targetSprintId: number | null;
  }) => Promise<void>;
}

export function useAccountWorkModal({
  isOpen,
  task,
  sprints,
  currentSprintId,
  onConfirm,
  onClose,
}: UseAccountWorkModalProps) {
  const { t } = useI18n();
  const [burnedStoryPoints, setBurnedStoryPoints] = useState<string>('');
  const [burnedTestPoints, setBurnedTestPoints] = useState<string>('');
  const [remainingStoryPoints, setRemainingStoryPoints] = useState<string>('');
  const [remainingTestPoints, setRemainingTestPoints] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [targetSprintId, setTargetSprintId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Инициализируем значения при открытии модального окна
  useEffect(() => {
    // Находим следующий спринт (первый неархивный спринт после текущего)
    const getNextSprint = () => {
      if (!currentSprintId) return null;

      const currentIndex = sprints.findIndex(s => s.id === currentSprintId);
      if (currentIndex === -1) return null;

      // Ищем следующий неархивный спринт
      for (let i = currentIndex + 1; i < sprints.length; i++) {
        if (!sprints[i].archived) {
          return sprints[i].id;
        }
      }

      return null;
    };

    if (isOpen && task) {
      setNewTaskTitle(task.name);
      setTargetSprintId(getNextSprint());
      // Копируем значения story points и test points в поля для сожжения
      setBurnedStoryPoints(task.storyPoints?.toString() || '');
      setBurnedTestPoints(task.testPoints?.toString() || '');
      setRemainingStoryPoints('');
      setRemainingTestPoints('');
    }
  }, [isOpen, task, currentSprintId, sprints]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!task) return;

      const burnedSP = parseInt(burnedStoryPoints, 10) || 0;
      const burnedTP = parseInt(burnedTestPoints, 10) || 0;
      const remainingSP = parseInt(remainingStoryPoints, 10) || 0;
      const remainingTP = parseInt(remainingTestPoints, 10) || 0;

      if (!newTaskTitle.trim()) {
        toast.error(t('account.workModal.titleRequired'));
        return;
      }

      if (!targetSprintId) {
        toast.error(t('account.workModal.sprintRequired'));
        return;
      }

      setIsLoading(true);
      try {
        await onConfirm({
          burnedStoryPoints: burnedSP,
          burnedTestPoints: burnedTP,
          remainingStoryPoints: remainingSP,
          remainingTestPoints: remainingTP,
          newTaskTitle: newTaskTitle.trim(),
          targetSprintId,
        });
        onClose();
      } catch (error) {
        console.error('Error accounting work:', error);
        const errorMessage =
          error instanceof Error ? error.message : t('account.workModal.submitError');
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      task,
      burnedStoryPoints,
      burnedTestPoints,
      remainingStoryPoints,
      remainingTestPoints,
      newTaskTitle,
      targetSprintId,
      onConfirm,
      onClose,
      t,
    ]
  );

  // Фильтруем неархивные спринты
  const availableSprints = sprints.filter(s => !s.archived);

  return {
    burnedStoryPoints,
    setBurnedStoryPoints,
    burnedTestPoints,
    setBurnedTestPoints,
    remainingStoryPoints,
    setRemainingStoryPoints,
    remainingTestPoints,
    setRemainingTestPoints,
    newTaskTitle,
    setNewTaskTitle,
    targetSprintId,
    setTargetSprintId,
    isLoading,
    availableSprints,
    handleSubmit,
  };
}

