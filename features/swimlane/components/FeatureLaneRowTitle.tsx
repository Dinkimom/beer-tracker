'use client';

import { useState } from 'react';

import { Input } from '@/components/Input';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { TextTooltip } from '@/components/TextTooltip';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';

interface FeatureLaneRowTitleProps {
  issueKey: string | null;
  issueType?: string | null;
  title: string;
  variant?: 'header' | 'list';
  onRename?: (name: string) => void;
}

const FEATURE_LANE_TITLE_ROW_CLASS = 'flex min-w-0 w-full items-center gap-1.5';
/** Одна высота названия и инпута — иначе счётчик SP/TP прыгает при клике. */
const FEATURE_LANE_RENAME_ROW_CLASS = `${FEATURE_LANE_TITLE_ROW_CLASS} min-h-7`;
const FEATURE_LANE_RENAME_TITLE_CLASS =
  'box-border flex h-7 min-h-7 items-center border border-transparent px-1.5';
const FEATURE_LANE_RENAME_INPUT_CLASS =
  '!box-border !h-7 !min-h-7 !min-w-0 flex-1 !px-1.5 !py-0 text-sm';

function resolveFeatureLaneRowTitleClasses(variant: 'header' | 'list'): {
  keyClassName: string;
  titleClassName: string;
} {
  if (variant === 'list') {
    return {
      keyClassName:
        'shrink-0 cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400',
      titleClassName: 'min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300',
    };
  }
  return {
    keyClassName:
      'shrink-0 cursor-pointer text-sm font-bold leading-tight text-blue-600 hover:underline dark:text-blue-400',
    titleClassName:
      'min-w-0 flex-1 truncate text-sm font-bold leading-tight text-gray-900 dark:text-gray-100',
  };
}

const FEATURE_LANE_ROW_TYPE_I18N: Record<string, string> = {
  draft: 'sprintPlanner.featureLanes.rowTypeDraft',
  epic: 'sprintPlanner.featureLanes.rowTypeEpic',
  story: 'sprintPlanner.featureLanes.rowTypeStory',
};

function featureLaneRowTypeTitle(
  issueType: string | null | undefined,
  t: (key: string) => string
): string | undefined {
  if (!issueType) {
    return undefined;
  }
  const i18nKey = FEATURE_LANE_ROW_TYPE_I18N[issueType];
  return i18nKey ? t(i18nKey) : issueType;
}

export function FeatureLaneRowTitle({
  issueKey,
  issueType,
  onRename,
  title,
  variant = 'header',
}: FeatureLaneRowTitleProps) {
  const { t } = useI18n();
  const issueUrl = useIssueTrackerIssueWebUrl(issueKey ?? '');
  const { keyClassName, titleClassName } = resolveFeatureLaneRowTitleClasses(variant);
  const [draft, setDraft] = useState(title);
  const [editing, setEditing] = useState(false);
  const typeTitle = featureLaneRowTypeTitle(issueType, t);
  const typeIcon = issueType ? (
    <TextTooltip content={typeTitle}>
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center self-center leading-none">
        <IssueTypeIcon className="h-4 w-4" type={issueType} />
      </span>
    </TextTooltip>
  ) : null;

  const commitRename = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== title) {
      onRename?.(next);
    } else {
      setDraft(title);
    }
  };

  const titleNode = onRename ? (
    <TextTooltip content={t('sprintPlanner.featureLanes.renameRow')}>
    <button
      className={`${titleClassName} ${FEATURE_LANE_RENAME_TITLE_CLASS} cursor-text rounded-md text-left transition-all duration-200 hover:bg-black/5 hover:underline active:scale-[0.99] active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15`}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setDraft(title);
        setEditing(true);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="min-w-0 truncate">{title}</span>
    </button>
    </TextTooltip>
  ) : (
    <OverflowTooltip content={title}>
      <span className={titleClassName}>{title}</span>
    </OverflowTooltip>
  );

  if (editing && onRename) {
    return (
      <span className={FEATURE_LANE_RENAME_ROW_CLASS}>
        {typeIcon}
        <Input
          aria-label={t('sprintPlanner.featureLanes.renameRow')}
          autoFocus
          className={FEATURE_LANE_RENAME_INPUT_CLASS}
          value={draft}
          onBlur={commitRename}
          onChange={(event) => setDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitRename();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(title);
              setEditing(false);
            }
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        />
      </span>
    );
  }

  if (!typeIcon && !issueKey) {
    return titleNode;
  }

  return (
    <span className={onRename ? FEATURE_LANE_RENAME_ROW_CLASS : FEATURE_LANE_TITLE_ROW_CLASS}>
      {typeIcon}
      {issueKey ? (
        <TextTooltip content={t('sprintPlanner.occupancy.openInTracker', { key: issueKey })}>
        <a
          className={keyClassName}
          href={issueUrl}
          rel="noopener noreferrer"
          target="_blank"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {issueKey}
        </a>
        </TextTooltip>
      ) : null}
      {titleNode}
    </span>
  );
}
