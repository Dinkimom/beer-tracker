'use client';

import type { Developer } from '@/types';
import type { IssueComment } from '@/types/tracker';

import ReactMarkdown from 'react-markdown';

import { Avatar } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { getInitials } from '@/utils/displayUtils';

import { dateTimeToFractionalCellInRange } from '../../utils/sprintCellUtils';

const COMMENT_ICON_SIZE_PX = 18;

interface OccupancyIssueCommentIconProps {
  comment: IssueComment;
  developerMap: Map<string, Developer>;
  sprintStartDate: Date;
  timelineEndCell: number;
  timelineStartCell: number;
  /** Явный `top` (строка факта со стеком); иначе — вылет над полосой. */
  topPx?: number;
  totalParts: number;
}

/** Иконка комментария из Трекера на таймлайне (факт или недельная ячейка квартала). */
export function OccupancyIssueCommentIcon({
  comment,
  developerMap,
  sprintStartDate,
  timelineStartCell,
  timelineEndCell,
  topPx,
  totalParts,
}: OccupancyIssueCommentIconProps) {
  const iconSizePx = COMMENT_ICON_SIZE_PX;
  const positionStyle: React.CSSProperties = {
    width: iconSizePx,
    height: iconSizePx,
    top: topPx ?? -iconSizePx / 2 - 2,
    zIndex: ZIndex.stickyInContent,
    transform: 'translateX(-50%)',
  };
  const commentDate = new Date(comment.createdAt);

  const cellPosition = dateTimeToFractionalCellInRange(sprintStartDate, commentDate, totalParts);

  if (
    cellPosition < timelineStartCell ||
    cellPosition > timelineEndCell ||
    cellPosition < 0 ||
    cellPosition > totalParts
  ) {
    return null;
  }

  const spanCells = timelineEndCell - timelineStartCell;
  const leftInSpan = cellPosition - timelineStartCell;
  const leftPercent = spanCells > 0 ? (leftInSpan / spanCells) * 100 : 0;

  const formattedDate = new Date(comment.createdAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const initials = getInitials(comment.createdBy.display);
  const developer = developerMap.get(comment.createdBy.id);
  const avatarUrl = developer?.avatarUrl;

  return (
    <TextTooltip
      content={
        <div className="max-w-sm overflow-hidden rounded-lg">
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-lg">
            <Avatar
              avatarUrl={avatarUrl}
              className="flex-shrink-0 shadow-sm"
              initials={initials}
              initialsVariant="primary"
              size="lg"
            />
            <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {comment.createdBy.display}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formattedDate}
              </div>
            </div>
          </div>
          <div className="px-3 py-2.5 max-h-96 overflow-y-auto">
            <div className="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-0.5 [&_code]:bg-gray-100 [&_code]:dark:bg-gray-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_a]:text-blue-600 [&_a]:dark:text-blue-400 [&_a]:hover:underline [&_pre]:bg-gray-100 [&_pre]:dark:bg-gray-700 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:dark:border-gray-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:dark:text-gray-400">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
                  a: ({ href, children }) => (
                    <a href={href} rel="noopener noreferrer" target="_blank">
                      {children}
                    </a>
                  ),
                }}
              >
                {comment.text}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      }
      contentClassName="!bg-white dark:!bg-gray-800 !p-0 !shadow-2xl !border !border-gray-200 dark:!border-gray-700 !rounded-lg !overflow-hidden"
      delayDuration={150}
      interactive
      side="top"
    >
      <span
        className="absolute inline-block pointer-events-auto cursor-pointer hover:[&>*]:scale-125 hover:[&>*]:shadow-lg transition-all duration-200 [&>*]:shadow-md"
        style={{
          ...positionStyle,
          left: `${leftPercent}%`,
        }}
      >
        <Avatar
          avatarUrl={avatarUrl}
          className="border-white dark:border-white"
          initials={initials}
          initialsVariant="primary"
          size="xs"
        />
      </span>
    </TextTooltip>
  );
}
