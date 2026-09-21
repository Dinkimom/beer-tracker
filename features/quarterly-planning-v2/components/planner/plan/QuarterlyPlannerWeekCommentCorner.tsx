'use client';

import type { Developer } from '@/types';
import type { IssueComment } from '@/types/tracker';

import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';

import { QuarterlyPlannerIssueCommentTooltipContent } from './quarterlyPlannerIssueCommentTooltipContent';

const CORNER_SIZE_PX = 9;

interface QuarterlyPlannerWeekCommentCornerProps {
  comments: IssueComment[];
  developerMap: Map<string, Developer>;
}

/** Индикатор комментария в ячейке недели (угловой маркер, как в Google Sheets). */
export function QuarterlyPlannerWeekCommentCorner({
  comments,
  developerMap,
}: QuarterlyPlannerWeekCommentCornerProps) {
  if (comments.length === 0) return null;

  const tooltipContent =
    comments.length === 1 ? (
      <QuarterlyPlannerIssueCommentTooltipContent
        comment={comments[0]!}
        developerMap={developerMap}
      />
    ) : (
      <div className="max-w-sm overflow-hidden rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        {comments.map((comment) => (
          <QuarterlyPlannerIssueCommentTooltipContent
            key={comment.id}
            comment={comment}
            developerMap={developerMap}
          />
        ))}
      </div>
    );

  return (
    <TextTooltip
      content={tooltipContent}
      contentClassName="!bg-white dark:!bg-gray-800 !p-0 !shadow-2xl !border !border-gray-200 dark:!border-gray-700 !rounded-lg !overflow-hidden"
      delayDuration={150}
      interactive
      side="top"
      singleInGroupId={comments.map((c) => c.id).join(',')}
    >
      <button
        aria-label={comments.length === 1 ? comments[0]!.text.slice(0, 80) : undefined}
        className="group pointer-events-auto absolute top-0 right-0 z-[1] block cursor-default border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-0"
        style={{ zIndex: ZIndex.stickyInContent }}
        type="button"
      >
        <span
          aria-hidden
          className="block transition-[filter] duration-150 group-hover:brightness-110"
          style={{
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: `0 ${CORNER_SIZE_PX}px ${CORNER_SIZE_PX}px 0`,
            borderColor: 'transparent #facc15 transparent transparent',
          }}
        />
      </button>
    </TextTooltip>
  );
}
