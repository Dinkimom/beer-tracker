'use client';

import type { GitLabFactEventBatch } from '@/lib/gitlab/mergeRequestFactTimelineHelpers';
import type { GitLabFactEvent } from '@/lib/gitlab/mergeRequestFactTypes';

import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { GITLAB_FACT_CHIP_SIZE_PX } from '@/features/gitlab/utils/gitlabFactTimelineLayoutHelpers';

function eventGlyph(kind: GitLabFactEvent['kind']): string {
  switch (kind) {
    case 'merged':
      return '🔀';
    case 'approved':
      return '✅';
    case 'pipeline_success':
      return '🟢';
    case 'pipeline_failed':
      return '🔴';
    default:
      return '•';
  }
}

function eventChipClass(kind: GitLabFactEvent['kind']): string {
  switch (kind) {
    case 'merged':
      return 'bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200 border-violet-300 dark:border-violet-700';
    case 'approved':
      return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700';
    case 'pipeline_success':
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700';
    case 'pipeline_failed':
      return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
  }
}

function eventTitle(
  kind: GitLabFactEvent['kind'],
  t: (key: string, params?: Record<string, string>) => string,
  branch?: string
): string {
  switch (kind) {
    case 'merged':
      return branch
        ? t('settings.occupancySection.gitlabEventMergedInto', { branch })
        : t('settings.occupancySection.gitlabEventMerged');
    case 'approved':
      return t('settings.occupancySection.gitlabEventApproved');
    case 'pipeline_success':
      return t('settings.occupancySection.gitlabEventPipelineOk');
    case 'pipeline_failed':
      return t('settings.occupancySection.gitlabEventPipelineFail');
    default:
      return kind;
  }
}

function formatEventAt(at: string): string {
  return new Date(at).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface GitlabFactTimelineMarkerProps {
  batch: GitLabFactEventBatch;
  idx: number;
  leftPercent: number;
  taskId: string;
  topPx: number;
}

/** Чип GitLab на факте: слой «событие GitLab» в стеке источников. */
export function GitlabFactTimelineMarker({
  batch,
  idx,
  leftPercent,
  taskId,
  topPx,
}: GitlabFactTimelineMarkerProps) {
  const { t } = useI18n();
  const mergedBranch =
    batch.kind === 'merged' ? batch.items.find((item) => item.label)?.label : undefined;
  const title = eventTitle(batch.kind, t, mergedBranch);
  const count = batch.items.length;
  const ariaLabel =
    count > 1
      ? t('settings.occupancySection.gitlabEventBatchAria', { title, count: String(count) })
      : title;

  return (
    <TextTooltip
      content={
        <div className="px-3 py-2 max-w-xs">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {count > 1 ? `${title} ×${count}` : title}
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {batch.items.map((item, itemIdx) => (
              <li
                key={`${item.at}-${item.label ?? ''}-${itemIdx}`}
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                {item.label && batch.kind !== 'merged' ? (
                  <div className="leading-snug">{item.label}</div>
                ) : null}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatEventAt(item.at)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      }
      contentClassName="!bg-white dark:!bg-gray-800 !p-0 !shadow-2xl !border !border-gray-200 dark:!border-gray-700 !rounded-lg !overflow-hidden"
      delayDuration={150}
      interactive
      side="top"
    >
      <span
        aria-label={ariaLabel}
        className="absolute inline-flex pointer-events-auto cursor-pointer hover:[&>*]:scale-110 hover:[&>*]:shadow-lg transition-all duration-150 [&>*]:shadow-md"
        data-gitlab-event={`${batch.kind}-${idx}`}
        data-gitlab-event-count={count}
        data-task-id={taskId}
        style={{
          left: `${leftPercent}%`,
          top: topPx,
          width: GITLAB_FACT_CHIP_SIZE_PX,
          height: GITLAB_FACT_CHIP_SIZE_PX,
          zIndex: ZIndex.stickyInContent,
          transform: 'translateX(-50%)',
        }}
      >
        <span
          className={`relative inline-flex size-full items-center justify-center rounded-sm border text-[14px] leading-none ${eventChipClass(batch.kind)}`}
        >
          <span aria-hidden>{eventGlyph(batch.kind)}</span>
          {count > 1 ? (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-gray-900 px-0.5 text-[9px] font-semibold leading-none text-white dark:bg-gray-100 dark:text-gray-900"
            >
              {count}
            </span>
          ) : null}
        </span>
      </span>
    </TextTooltip>
  );
}
