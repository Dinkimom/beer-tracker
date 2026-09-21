'use client';

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { SwimlanePlacementTool } from '@/lib/layers';
import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { CardLinkIcon } from '@/components/CardLinkIcon';
import { Icon } from '@/components/Icon';
import { JiraToolIcon } from '@/components/JiraToolIcon';
import { YandexTrackerToolIcon } from '@/components/YandexTrackerToolIcon';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';
import { StickyNoteToolIcon } from '@/features/comments/components/StickyNoteToolIcon';
import { CONTEXT_MENU_GHOST_BUTTON_RESET } from '@/features/context-menu/contextMenuClasses';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { STICKY_NOTE_COLOR_LABEL_KEYS, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';

import {
  formatPlannerShortcutAria,
  PlannerShortcutTooltip,
} from './PlannerShortcutTooltip';
import { SwimlanePlacementToolbarCursorIcon } from './SwimlanePlacementToolbarCursorIcon';
import { formatPlacementToolShortcutHint } from './swimlanePlacementToolbarKeyboard';

const TOOL_ICONS: Record<Exclude<SwimlanePlacementTool, 'comment' | 'cursor' | 'diagram' | 'link' | 'task'>, string> = {
  availability: 'calendar',
  image: 'image',
};

interface SwimlanePlacementToolbarButtonProps {
  active: boolean;
  expanded?: boolean;
  noteColor?: StickyNoteColor;
  showSeparatorBefore: boolean;
  tool: SwimlanePlacementTool;
  onSelect: () => void;
}

function resolvePlacementToolbarTaskGlyph(kind: IssueTrackerProviderKind): ReactNode {
  if (isJiraProviderKind(kind)) {
    return <JiraToolIcon className="h-4 w-4 shrink-0" />;
  }
  return <YandexTrackerToolIcon className="h-4 w-4 shrink-0" />;
}

function resolvePlacementToolbarGlyph(
  tool: SwimlanePlacementTool,
  noteColor: StickyNoteColor | undefined,
  isDark: boolean,
  active: boolean,
  issueTrackerKind: IssueTrackerProviderKind
): ReactNode {
  if (tool === 'cursor') {
    return <SwimlanePlacementToolbarCursorIcon filled={active} />;
  }
  if (tool === 'link') {
    return <CardLinkIcon />;
  }
  if (tool === 'comment') {
    return (
      <StickyNoteToolIcon
        className="h-4 w-4 shrink-0"
        color={active ? noteColor : undefined}
        isDark={isDark}
        variant={active ? 'filled' : 'outline'}
      />
    );
  }
  if (tool === 'task') {
    return resolvePlacementToolbarTaskGlyph(issueTrackerKind);
  }
  if (tool === 'diagram') {
    return <ExcalidrawMark className="h-3.5 w-3.5 shrink-0" tone={active ? 'brand' : 'inherit'} />;
  }
  return <Icon className="h-4 w-4 shrink-0" name={TOOL_ICONS[tool]} />;
}

export function SwimlanePlacementToolbarButton({
  active,
  expanded,
  noteColor,
  showSeparatorBefore,
  tool,
  onSelect,
}: SwimlanePlacementToolbarButtonProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const issueTrackerKind = useIssueTrackerProviderKind();
  const label = t(`sprintPlanner.swimlane.placementToolbar.${tool}`);
  const colorLabel =
    tool === 'comment' && active && noteColor
      ? t(STICKY_NOTE_COLOR_LABEL_KEYS[noteColor])
      : undefined;
  const title = colorLabel ? `${label} · ${colorLabel}` : label;
  const shortcut = formatPlacementToolShortcutHint(tool);
  const iconOnly = tool === 'cursor';
  return (
    <>
      {showSeparatorBefore ? (
        <div
          aria-hidden
          className="mx-1 h-6 w-px shrink-0 self-center bg-gray-200 dark:bg-gray-600"
        />
      ) : null}
      <PlannerShortcutTooltip label={title} shortcut={shortcut} side="top">
        <Button
          aria-expanded={tool === 'comment' ? expanded : undefined}
          aria-haspopup={tool === 'comment' ? 'dialog' : undefined}
          aria-label={formatPlannerShortcutAria(title, shortcut)}
          aria-pressed={active}
          className={`!h-9 !min-h-0 !min-w-0 !rounded-lg !py-0 font-medium ${
            iconOnly ? '!w-9 !gap-0 !px-0' : '!gap-2 !px-3 text-sm'
          } ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
            active
              ? '!bg-blue-50 !text-blue-700 hover:!bg-blue-100 dark:!bg-blue-500/20 dark:!text-blue-200 dark:hover:!bg-blue-500/30'
              : 'text-gray-600 hover:!bg-gray-50 dark:text-gray-300 dark:hover:!bg-gray-700'
          }`}
          type="button"
          variant="ghost"
          onClick={onSelect}
        >
          {resolvePlacementToolbarGlyph(tool, noteColor, isDark, active, issueTrackerKind)}
          {iconOnly ? null : <span>{label}</span>}
        </Button>
      </PlannerShortcutTooltip>
    </>
  );
}
