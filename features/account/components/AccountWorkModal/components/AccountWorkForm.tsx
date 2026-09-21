'use client';

/**
 * Компонент формы для AccountWorkModal
 */

import type { SprintListItem } from '@/types/tracker';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { TextArea } from '@/components/TextArea';
import { useI18n } from '@/contexts/LanguageContext';
import { SprintCustomSelect } from '@/features/sprint/components/SprintCustomSelect';

interface AccountWorkFormProps {
  availableSprints: SprintListItem[];
  burnedStoryPoints: string;
  burnedTestPoints: string;
  isLoading: boolean;
  newTaskTitle: string;
  remainingStoryPoints: string;
  remainingTestPoints: string;
  targetSprintId: number | null;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setBurnedStoryPoints: (value: string) => void;
  setBurnedTestPoints: (value: string) => void;
  setNewTaskTitle: (value: string) => void;
  setRemainingStoryPoints: (value: string) => void;
  setRemainingTestPoints: (value: string) => void;
  setTargetSprintId: (value: number | null) => void;
}

export function AccountWorkForm({
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
  availableSprints,
  isLoading,
  onSubmit,
  onCancel,
}: AccountWorkFormProps) {
  const { t, language } = useI18n();
  const sprintDateLocale = language === 'en' ? 'en-US' : 'ru-RU';
  return (
    <form className="space-y-3 mt-4" onSubmit={onSubmit}>
      {/* Группа полей для сожженных points */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('account.workModal.burnedSp')}
          </label>
          <Input
            className="py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500"
            min={0}
            placeholder="0"
            type="number"
            value={burnedStoryPoints}
            onChange={(e) => setBurnedStoryPoints(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('account.workModal.burnedTp')}
          </label>
          <Input
            className="py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500"
            min={0}
            placeholder="0"
            type="number"
            value={burnedTestPoints}
            onChange={(e) => setBurnedTestPoints(e.target.value)}
          />
        </div>
      </div>

      {/* Группа полей для оставшихся points */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('account.workModal.remainingSp')}
          </label>
          <Input
            className="py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500"
            min={0}
            placeholder="0"
            type="number"
            value={remainingStoryPoints}
            onChange={(e) => setRemainingStoryPoints(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('account.workModal.remainingTp')}
          </label>
          <Input
            className="py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500"
            min={0}
            placeholder="0"
            type="number"
            value={remainingTestPoints}
            onChange={(e) => setRemainingTestPoints(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('account.workModal.newTaskTitle')}
        </label>
        <TextArea
          className="py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500"
          required
          rows={2}
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('account.workModal.targetSprint')}
        </label>
        <SprintCustomSelect
          disabled={isLoading}
          emptyPlaceholder={t('account.workModal.noSprints')}
          locale={sprintDateLocale}
          placeholder={t('account.workModal.selectSprintPlaceholder')}
          searchPlaceholder={t('account.workModal.sprintSearchPlaceholder')}
          selectedSprintId={targetSprintId}
          sprints={availableSprints}
          onChange={setTargetSprintId}
        />
      </div>

      <div className="flex gap-3 pt-3">
        <Button
          className="flex-1 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          variant="secondary"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </Button>
        <Button
          className="flex-1 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          type="submit"
          variant="primary"
        >
          {isLoading ? t('account.workModal.processing') : t('account.workModal.confirm')}
        </Button>
      </div>
    </form>
  );
}

