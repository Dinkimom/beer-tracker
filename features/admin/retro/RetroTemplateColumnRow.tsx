'use client';

import type { RetroColumn } from '@/lib/retro/retroBoardShared';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { field } from '@/features/admin/adminUiTokens';
import { retroColumnTitle } from '@/features/retro/components/retroUi';

interface RetroTemplateColumnRowProps {
  canDelete: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  column: RetroColumn;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onRename: (title: string) => void;
}

export function RetroTemplateColumnRow({
  canDelete,
  canMoveDown,
  canMoveUp,
  column,
  onDelete,
  onMove,
  onRename,
}: RetroTemplateColumnRowProps) {
  const { t } = useI18n();
  const presetName = retroColumnTitle({ ...column, title: '' }, t);
  const shownTitle = column.title.trim() ? column.title : presetName;

  function commitTitle(next: string) {
    onRename(next.trim() === presetName ? '' : next);
  }

  return (
    <li className="flex items-center gap-2 px-5 py-3">
      <input
        aria-label={t('admin.retroTemplate.columnName')}
        className={`${field} min-w-0 flex-1`}
        value={shownTitle}
        onChange={(event) => commitTitle(event.target.value)}
      />
      <button
        aria-label={t('admin.retroTemplate.moveUp')}
        className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
        disabled={!canMoveUp}
        type="button"
        onClick={() => onMove(-1)}
      >
        <Icon className="h-4 w-4" name="chevron-up" />
      </button>
      <button
        aria-label={t('admin.retroTemplate.moveDown')}
        className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
        disabled={!canMoveDown}
        type="button"
        onClick={() => onMove(1)}
      >
        <Icon className="h-4 w-4" name="chevron-down" />
      </button>
      <button
        aria-label={t('admin.retroTemplate.deleteColumn')}
        className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
        disabled={!canDelete}
        type="button"
        onClick={onDelete}
      >
        <Icon className="h-4 w-4" name="trash" />
      </button>
    </li>
  );
}
