'use client';

import type { Task, TaskParent } from '@/types';

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import { Button } from '@/components/Button';
import { CardLinkIcon } from '@/components/CardLinkIcon';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  AssigneeSubmenu,
  type ContextMenuAssigneeOptions,
} from '@/features/context-menu/components/AssigneeSubmenu';
import { ParentSubmenu } from '@/features/context-menu/components/ParentSubmenu';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW,
  CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_SEPARATOR,
  FLOATING_MENU_SHELL,
} from '@/features/context-menu/contextMenuClasses';
import {
  measureContextMenuLayoutSize,
  resolveContextMenuViewportPosition,
} from '@/features/context-menu/utils/resolveContextMenuViewportPosition';
import { useFollowAnchorRectByElementId } from '@/hooks/useFollowAnchorRect';
import { useDeferredOverlayClose } from '@/hooks/useOverlayPresence';

function contextMenuDeleteLabel(
  t: (key: string) => string,
  variant: 'diagram' | 'image' | 'note'
): string {
  if (variant === 'image') {
    return t('sprintPlanner.contextMenu.deleteImage');
  }
  if (variant === 'diagram') {
    return t('sprintPlanner.contextMenu.deleteDiagram');
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
  parentOptions?: TaskParent[];
  position: { x: number; y: number };
  task?: Task | null;
  variant?: 'diagram' | 'image' | 'note';
  onAssigneeSelect?: (assigneeId: string) => void;
  onClose: () => void;
  onConvertToTask?: () => void;
  onCopy?: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onParentSelect?: (parent: TaskParent | null) => void;
  onStartLinking?: () => void;
}

export function SwimlaneCommentContextMenu({
  anchorElementId = null,
  anchorRect = null,
  authorName = null,
  boardId = null,
  parentOptions = [],
  position,
  assigneeOptions = null,
  task = null,
  onAssigneeSelect,
  onClose,
  onConvertToTask,
  onCopy,
  onDelete,
  onEdit,
  onParentSelect,
  onStartLinking,
  variant = 'note',
}: SwimlaneCommentContextMenuProps) {
  const { t } = useI18n();
  const isImage = variant === 'image';
  const isDiagram = variant === 'diagram';
  const author = authorName?.trim();
  const showLink = onStartLinking != null;
  const showNoteActions = !isImage;
  const menuRef = useRef<HTMLDivElement>(null);
  const parentButtonRef = useRef<HTMLButtonElement>(null);
  const assigneeButtonRef = useRef<HTMLButtonElement>(null);
  const [isParentMenuOpen, setIsParentMenuOpen] = useState(false);
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
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
        className={`fixed w-max min-w-[220px] max-w-[min(20rem,calc(100vw-2rem))] overflow-visible py-1 ${FLOATING_MENU_SHELL} ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: ZIndex.contextMenu,
        }}
        onAnimationEnd={overlay.onAnimationEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {author ? (
          <>
            <div
              aria-label={t('comments.authorAria', { name: author })}
              className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t('sprintPlanner.contextMenu.imageAuthor', { name: author })}
            </div>
            {isImage ? <div className={CONTEXT_MENU_SEPARATOR} role="separator" /> : null}
          </>
        ) : null}
        {isImage ? null : (
          <>
            <Button
              className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
              type="button"
              variant="ghost"
              onClick={onEdit}
            >
              <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" name="edit" />
              <span>
                {isDiagram
                  ? t('sprintPlanner.contextMenu.editDiagram')
                  : t('sprintPlanner.contextMenu.editNote')}
              </span>
            </Button>
            {isDiagram ? null : (
              <Button
                className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
                type="button"
                variant="ghost"
                onClick={onConvertToTask}
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" name="file-text" />
                <span>{t('sprintPlanner.contextMenu.convertNoteToTask')}</span>
              </Button>
            )}
            {onCopy ? (
              <Button
                className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
                type="button"
                variant="ghost"
                onClick={onCopy}
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" name="copy" />
                <span>{t('sprintPlanner.contextMenu.copyNote')}</span>
              </Button>
            ) : null}
          </>
        )}
        {renderSwimlaneCommentAssigneeSubmenu({
          assigneeButtonRef,
          assigneeOptions,
          isOpen: isAssigneeMenuOpen,
          menuRef,
          onClose: requestClose,
          onSelect: onAssigneeSelect,
          onToggle: () => {
            setIsParentMenuOpen(false);
            setIsAssigneeMenuOpen((open) => !open);
          },
          show: showAssignee,
          task,
        })}
        {renderSwimlaneCommentParentSubmenu({
          boardId,
          isOpen: isParentMenuOpen,
          menuRef,
          onSelect: onParentSelect,
          onToggle: () => {
            setIsAssigneeMenuOpen(false);
            setIsParentMenuOpen((open) => !open);
          },
          parentButtonRef,
          parentOptions,
          show: showParent,
          task,
        })}
        {showLink ? (
          <Button
            className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
            type="button"
            variant="ghost"
            onClick={() => {
              onStartLinking?.();
              requestClose();
            }}
          >
            <CardLinkIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>{t('sprintPlanner.contextMenu.linkCards')}</span>
          </Button>
        ) : null}
        {showNoteActions || showLink || showParent || showAssignee ? (
          <div className={CONTEXT_MENU_SEPARATOR} role="separator" />
        ) : null}
        <Button
          className={`${CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
          type="button"
          variant="ghost"
          onClick={onDelete}
        >
          <Icon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" name="trash" />
          <span>{contextMenuDeleteLabel(t, variant)}</span>
        </Button>
      </div>
    </>
  );
}

function renderSwimlaneCommentAssigneeSubmenu(input: {
  assigneeButtonRef: RefObject<HTMLButtonElement | null>;
  assigneeOptions: ContextMenuAssigneeOptions | null;
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
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
      buttonRef={input.assigneeButtonRef}
      isLoading={false}
      isOpen={input.isOpen}
      menuRef={input.menuRef}
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
  menuRef: RefObject<HTMLDivElement | null>;
  parentButtonRef: RefObject<HTMLButtonElement | null>;
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
      buttonRef={input.parentButtonRef}
      isLoading={false}
      isOpen={input.isOpen}
      menuRef={input.menuRef}
      parentOptions={input.parentOptions}
      task={input.task}
      onSelect={input.onSelect}
      onToggle={input.onToggle}
    />
  );
}
