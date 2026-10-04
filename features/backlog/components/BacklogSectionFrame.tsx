'use client';

import type { ReactNode } from 'react';

import { useDroppable } from '@dnd-kit/core';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const STATIC_SECTION_ID = 'backlog-static-section';

interface BacklogSectionFrameProps {
  children?: ReactNode;
  countLabel?: string;
  /** Идентификатор зоны сброса. Без него секция не принимает задачи. */
  droppableId?: string;
  expanded: boolean;
  meta?: ReactNode;
  title: string;
  onToggle: () => void;
}

export function BacklogSectionFrame({
  children,
  countLabel,
  droppableId,
  expanded,
  meta,
  title,
  onToggle,
}: BacklogSectionFrameProps) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId ?? STATIC_SECTION_ID,
    disabled: droppableId == null,
  });
  const dropHighlight = isOver && droppableId != null;

  return (
    <section
      ref={setNodeRef}
      className={`overflow-hidden rounded-2xl border bg-white transition-colors dark:bg-ds-surface-header ${
        dropHighlight
          ? 'border-blue-400 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/40'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <button
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
        type="button"
        onClick={onToggle}
      >
        <span className="sr-only">{t(expanded ? 'backlog.section.collapse' : 'backlog.section.expand')}</span>
        <Icon
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
            expanded ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
        <span className="min-w-0 max-w-[min(28rem,46%)] truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </span>
        {meta ? (
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">{meta}</span>
        ) : (
          <span className="flex-1" />
        )}
        {countLabel ? (
          <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{countLabel}</span>
        ) : null}
      </button>
      {expanded && children ? (
        <div className="border-t border-gray-100 dark:border-gray-700">{children}</div>
      ) : null}
    </section>
  );
}
