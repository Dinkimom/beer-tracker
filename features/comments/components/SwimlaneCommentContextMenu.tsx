'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Task, TaskParent } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { CardLinkIcon } from '@/components/CardLinkIcon';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  AssigneeSubmenu,
  type ContextMenuAssigneeOptions,
} from '@/features/context-menu/components/AssigneeSubmenu';
import { ContextMenuGroup } from '@/features/context-menu/components/ContextMenuGroup';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import { ParentSubmenu } from '@/features/context-menu/components/ParentSubmenu';
import { SprintSubmenu } from '@/features/context-menu/components/SprintSubmenu';
import {
  FLOATING_MENU_GLASS_SHELL,
  MENU_PANEL_PADDING,
  MENU_ROW_ICON,
  MENU_SECTION_LABEL,
} from '@/features/context-menu/contextMenuClasses';
import {
  measureContextMenuLayoutSize,
  resolveContextMenuViewportPosition,
} from '@/features/context-menu/utils/resolveContextMenuViewportPosition';
import { StickyNoteColorSwatches } from '@/features/task/components/TaskBar/StickyNoteColorSwatches';
import { useFollowAnchorRectByElementId } from '@/hooks/useFollowAnchorRect';
import { useDeferredOverlayClose } from '@/hooks/useOverlayPresence';

function contextMenuDeleteLabel(
  t: (key: string) => string,
  variant: 'diagram' | 'image' | 'note' | 'widget'
): string {
  if (variant === 'image') {
    return t('sprintPlanner.contextMenu.deleteImage');
  }
  if (variant === 'diagram') {
    return t('sprintPlanner.contextMenu.deleteDiagram');
  }
  if (variant === 'widget') {
    return t('sprintPlanner.contextMenu.deleteCard');
  }
  return t('sprintPlanner.contextMenu.deleteNote');
}

interface SwimlaneCommentContextMenuProps {
  /** DOM id полосы свимлейна — меню следует за живым getBoundingClientRect */
  anchorElementId?: string | null;
  anchorRect?: Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'> | null;
  assigneeOptions?: ContextMenuAssigneeOptions | null;
  authorName?: string | null;
  boardId?: number | null;
  currentSprintId?: number | null;
  noteColor?: StickyNoteColor;
  parentOptions?: TaskParent[];
  position: { x: number; y: number };
  sprints?: SprintListItem[];
  task?: Task | null;
  variant?: 'diagram' | 'image' | 'note' | 'widget';
  /** «Попросить агента» по заметке: её текст уходит агенту как контекст. */
  onAskAgent?: () => void;
  onAssigneeSelect?: (assigneeId: string) => void;
  onClose: () => void;
  onConvertToTask?: () => void;
  onCopy?: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  /** Перенос в другой спринт: сразу с выбором места на его доске, без бэклога. */
  onMoveToSprint?: (sprintId: number) => void;
  onNoteColorChange?: (color: StickyNoteColor) => void;
  onParentSelect?: (parent: TaskParent | null) => void;
  onStartLinking?: () => void;
}

export function SwimlaneCommentContextMenu({
  anchorElementId = null,
  anchorRect = null,
  authorName = null,
  boardId = null,
  currentSprintId = null,
  parentOptions = [],
  position,
  sprints = [],
  assigneeOptions = null,
  task = null,
  noteColor,
  onAskAgent,
  onAssigneeSelect,
  onClose,
  onConvertToTask,
  onCopy,
  onDelete,
  onEdit,
  onMoveToSprint,
  onNoteColorChange,
  onParentSelect,
  onStartLinking,
  variant = 'note',
}: SwimlaneCommentContextMenuProps) {
  const { t } = useI18n();
  const isImage = variant === 'image';
  const isDiagram = variant === 'diagram';
  const hidesComposer = isImage || variant === 'widget';
  const author = authorName?.trim();
  const showLink = onStartLinking != null;
  const menuRef = useRef<HTMLDivElement>(null);
  const [isParentMenuOpen, setIsParentMenuOpen] = useState(false);
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false);
  const sprintButtonRef = useRef<HTMLButtonElement>(null);
  const showSprint = onMoveToSprint != null;
  const showParent = onParentSelect != null && task != null;
  const showAssignee = onAssigneeSelect != null && assigneeOptions != null && task != null;
  const liveAnchorRect = useFollowAnchorRectByElementId(anchorElementId);
  const effectiveAnchorRect = liveAnchorRect ?? anchorRect;
  const overlay = useDeferredOverlayClose(onClose);
  const requestClose = overlay.requestClose;

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) {
      return;
    }
    const apply = () => {
      const { height, width } = measureContextMenuLayoutSize(el);
      const next = resolveContextMenuViewportPosition({
        anchorRect: effectiveAnchorRect,
        menuHeight: height,
        menuWidth: width,
        position,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      });
      el.style.left = `${next.left}px`;
      el.style.top = `${next.top}px`;
    };
    apply();
    const raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, [effectiveAnchorRect, position]);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 bg-transparent"
        style={{ zIndex: ZIndex.contextMenu - 1 }}
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
      />
      <div
        ref={menuRef}
        className={`menu-groups fixed flex w-max min-w-[240px] max-w-[min(20rem,calc(100vw-2rem))] flex-col overflow-visible ${MENU_PANEL_PADDING} ${FLOATING_MENU_GLASS_SHELL} ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: ZIndex.contextMenu,
        }}
        onAnimationEnd={overlay.onAnimationEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <ContextMenuGroup>
          {renderContextMenuNoteColor({
            noteColor,
            variant,
            onChange: onNoteColorChange,
          })}
        </ContextMenuGroup>
        <ContextMenuGroup>
          {author ? (
            <div
              aria-label={t('comments.authorAria', { name: author })}
              className={`${MENU_SECTION_LABEL} truncate`}
            >
              {t('sprintPlanner.contextMenu.imageAuthor', { name: author })}
            </div>
          ) : null}
          {hidesComposer ? null : (
            <>
              <ContextMenuRow
                icon={<Icon className={MENU_ROW_ICON} name="edit" />}
                label={
                  isDiagram
                    ? t('sprintPlanner.contextMenu.editDiagram')
                    : t('sprintPlanner.contextMenu.editNote')
                }
                onClick={onEdit}
              />
              {isDiagram ? null : (
                <ContextMenuRow
                  icon={<Icon className={MENU_ROW_ICON} name="file-text" />}
                  label={t('sprintPlanner.contextMenu.convertNoteToTask')}
                  onClick={onConvertToTask}
                />
              )}
              {onAskAgent ? (
                <ContextMenuRow
                  data-note-ask-agent=""
                  icon={<Icon className={MENU_ROW_ICON} name="sparkles" />}
                  label={t('agentSession.menuAria')}
                  onClick={onAskAgent}
                />
              ) : null}
              {onCopy ? (
                <ContextMenuRow
                  icon={<Icon className={MENU_ROW_ICON} name="copy" />}
                  label={t('sprintPlanner.contextMenu.copyNote')}
                  onClick={onCopy}
                />
              ) : null}
            </>
          )}
        </ContextMenuGroup>
        <ContextMenuGroup>
          {renderSwimlaneCommentAssigneeSubmenu({
            assigneeOptions,
            isOpen: isAssigneeMenuOpen,
            onClose: requestClose,
            onSelect: onAssigneeSelect,
            onToggle: () => {
              setIsParentMenuOpen(false);
              setIsSprintMenuOpen(false);
              setIsAssigneeMenuOpen((open) => !open);
            },
            show: showAssignee,
            task,
          })}
          {renderSwimlaneCommentParentSubmenu({
            boardId,
            isOpen: isParentMenuOpen,
            onSelect: onParentSelect,
            onToggle: () => {
              setIsAssigneeMenuOpen(false);
              setIsSprintMenuOpen(false);
              setIsParentMenuOpen((open) => !open);
            },
            parentOptions,
            show: showParent,
            task,
          })}
          {showSprint ? (
            <SprintSubmenu
              buttonRef={sprintButtonRef}
              currentSprintId={currentSprintId}
              isBacklogTask={false}
              isLoading={false}
              isOpen={isSprintMenuOpen}
              menuRef={menuRef}
              sprints={sprints}
              onSelect={(sprintId) => {
                onMoveToSprint?.(sprintId);
                requestClose();
              }}
              onToggle={() => {
                setIsAssigneeMenuOpen(false);
                setIsParentMenuOpen(false);
                setIsSprintMenuOpen((open) => !open);
              }}
            />
          ) : null}
          {showLink ? (
            <ContextMenuRow
              icon={<CardLinkIcon className={MENU_ROW_ICON} />}
              label={t('sprintPlanner.contextMenu.linkCards')}
              onClick={() => {
                onStartLinking?.();
                requestClose();
              }}
            />
          ) : null}
        </ContextMenuGroup>
        <ContextMenuGroup>
          <ContextMenuRow
            destructive
            icon={<Icon className="h-4 w-4 shrink-0" name="trash" />}
            label={contextMenuDeleteLabel(t, variant)}
            onClick={onDelete}
          />
        </ContextMenuGroup>
      </div>
    </>
  );
}

function renderContextMenuNoteColor(input: {
  noteColor?: StickyNoteColor;
  variant: NonNullable<SwimlaneCommentContextMenuProps['variant']>;
  onChange?: (color: StickyNoteColor) => void;
}) {
  if (input.variant !== 'note' || input.noteColor == null || input.onChange == null) {
    return null;
  }
  return (
    <StickyNoteColorSwatches
      className="!justify-start !px-1"
      framed={false}
      value={input.noteColor}
      onChange={input.onChange}
    />
  );
}

function renderSwimlaneCommentAssigneeSubmenu(input: {
  assigneeOptions: ContextMenuAssigneeOptions | null;
  isOpen: boolean;
  show: boolean;
  task: Task | null;
  onClose: () => void;
  onSelect?: (assigneeId: string) => void;
  onToggle: () => void;
}): ReactNode {
  if (!input.show || !input.task || !input.assigneeOptions || !input.onSelect) {
    return null;
  }
  return (
    <AssigneeSubmenu
      isLoading={false}
      isOpen={input.isOpen}
      options={input.assigneeOptions}
      selectedAssigneeId={input.task.assignee ?? ''}
      task={input.task}
      onSelect={(assigneeId) => {
        input.onSelect?.(assigneeId);
        input.onClose();
      }}
      onToggle={input.onToggle}
    />
  );
}

function renderSwimlaneCommentParentSubmenu(input: {
  boardId: number | null;
  isOpen: boolean;
  parentOptions: TaskParent[];
  show: boolean;
  task: Task | null;
  onSelect?: (parent: TaskParent | null) => void;
  onToggle: () => void;
}): ReactNode {
  if (!input.show || !input.task || !input.onSelect) {
    return null;
  }
  return (
    <ParentSubmenu
      boardId={input.boardId}
      isLoading={false}
      isOpen={input.isOpen}
      parentOptions={input.parentOptions}
      task={input.task}
      onSelect={input.onSelect}
      onToggle={input.onToggle}
    />
  );
}
