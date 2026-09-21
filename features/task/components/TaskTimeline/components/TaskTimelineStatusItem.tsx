/**
 * Компонент элемента статуса для TaskTimeline
 */

'use client';

import type { StatusSummary } from '../types';
import type { IssueComment } from '@/types/tracker';

import { useI18n } from '@/contexts/LanguageContext';
import { getStatusColors } from '@/utils/statusColors';

import { formatTaskTimelineDuration } from '../utils/formatDuration';

import { CommentsTooltip } from './CommentsTooltip';

interface TaskTimelineStatusItemProps {
  comments: IssueComment[];
  status: StatusSummary;
}

function taskTimelineStatusItemClass(colors: ReturnType<typeof getStatusColors>): string {
  const bg = colors.bg || 'bg-gray-100';
  const bgDark = colors.bgDark || '';
  const border = colors.border ? `border ${colors.border}` : 'border border-gray-300';
  const borderDark = colors.borderDark || '';
  return `flex items-center gap-2.5 py-2 px-2.5 rounded-md ${bg} ${bgDark} ${border} ${borderDark} hover:opacity-90 transition-opacity`;
}

export function TaskTimelineStatusItem({ status, comments }: TaskTimelineStatusItemProps) {
  const { t } = useI18n();
  const colors = getStatusColors(status.statusKey);

  return (
    <div className={taskTimelineStatusItemClass(colors)}>
      {/* Название статуса */}
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${colors.text || 'text-gray-900'} ${colors.textDark || ''}`}>
          {status.statusName}
          {status.count > 1 && (
            <span className={`text-[10px] ml-1 font-normal ${colors.textDark ? 'opacity-80' : 'text-gray-600 dark:text-gray-400'}`}>
              ({status.count})
            </span>
          )}
        </div>
      </div>

      {/* Комментарии */}
      <CommentsTooltip comments={comments} />

      {/* Длительность */}
      <div className={`text-xs font-semibold whitespace-nowrap min-w-[3.5rem] text-right ${colors.text || 'text-gray-700'} ${colors.textDark || 'dark:text-gray-300'}`}>
        {formatTaskTimelineDuration(status.totalDurationMs, t)}
      </div>
    </div>
  );
}

