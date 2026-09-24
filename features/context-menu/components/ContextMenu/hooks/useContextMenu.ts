/**
 * Хук для управления логикой ContextMenu
 */

import type { Task, TaskParent } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { resolveTaskParentForMenu } from '@/features/context-menu/utils/buildContextMenuParentOptions';
import {
  type ContextMenuAnchorSide,
  measureContextMenuLayoutSize,
  resolveContextMenuViewportPosition,
} from '@/features/context-menu/utils/resolveContextMenuViewportPosition';

type ContextMenuAnchorRect = Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'>;

function isScrollTargetInsideSubmenu(e: Event): boolean {
  const target = e.target as HTMLElement;
  return target.closest('[data-submenu="true"]') !== null;
}

interface UseContextMenuProps {
  anchorRect?: ContextMenuAnchorRect | null;
  closeOnOutsideClick?: boolean;
  currentSprintId: number | null;
  isBacklogTask?: boolean;
  position: { x: number; y: number };
  sprints: SprintListItem[];
  task: Task;
  onClose: () => void;
  onCloseByClickOutside?: () => void;
  onMoveToSprint: (taskId: string, sprintId: number) => Promise<void>;
  onParentChange?: (taskId: string, parent: TaskParent | null) => Promise<void>;
  onRemoveFromPlan?: (taskId: string) => void;
  onRemoveFromSprint: (taskId: string) => Promise<void>;
  onStatusChange: (taskId: string, transitionId: string, targetStatusKey?: string, targetStatusDisplay?: string, screenId?: string) => Promise<void>;
}

export function useContextMenu({
  task,
  sprints,
  currentSprintId,
  position,
  anchorRect = null,
  closeOnOutsideClick = true,
  onClose,
  onCloseByClickOutside,
  onStatusChange,
  onMoveToSprint,
  onParentChange,
  onRemoveFromPlan,
  onRemoveFromSprint,
  isBacklogTask = false,
}: UseContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const sprintButtonRef = useRef<HTMLButtonElement>(null);
  const estimateButtonRef = useRef<HTMLButtonElement>(null);
  const parentButtonRef = useRef<HTMLButtonElement>(null);
  const assigneeButtonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransitionId, setPendingTransitionId] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false);
  const [isEstimateMenuOpen, setIsEstimateMenuOpen] = useState(false);
  const [isParentMenuOpen, setIsParentMenuOpen] = useState(false);
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const [anchorSide, setAnchorSide] = useState<ContextMenuAnchorSide>('right');
  const { confirm, confirmWithAction, DialogComponent } = useConfirmDialog();

  // Перенос/удаление из спринта: для синтетической QA-строки с привязкой к dev и ненулевым объёмом
  // двигаем dev-задачу в трекере; при 0 SP и TP≤0 — саму QA-задачу (отдельная фаза «чисто QA»).
  const sp = task.storyPoints ?? 0;
  const tp = task.testPoints ?? 0;
  const taskIdForActions =
    task.team === 'QA' && task.originalTaskId && (sp > 0 || tp > 0)
      ? task.originalTaskId
      : task.id;

  const closeOtherSubmenus = (keep: 'assignee' | 'estimate' | 'parent' | 'sprint' | 'status') => {
    if (keep !== 'status') setIsStatusMenuOpen(false);
    if (keep !== 'sprint') setIsSprintMenuOpen(false);
    if (keep !== 'estimate') setIsEstimateMenuOpen(false);
    if (keep !== 'parent') setIsParentMenuOpen(false);
    if (keep !== 'assignee') setIsAssigneeMenuOpen(false);
  };

  const handleStatusMenuToggle = () => {
    if (isLoading) return;
    if (!isStatusMenuOpen) closeOtherSubmenus('status');
    setIsStatusMenuOpen(!isStatusMenuOpen);
  };

  const handleSprintMenuToggle = () => {
    if (isLoading) return;
    if (!isSprintMenuOpen) closeOtherSubmenus('sprint');
    setIsSprintMenuOpen(!isSprintMenuOpen);
  };

  const handleEstimateMenuToggle = () => {
    if (isLoading) return;
    if (!isEstimateMenuOpen) closeOtherSubmenus('estimate');
    setIsEstimateMenuOpen(!isEstimateMenuOpen);
  };

  const handleParentMenuToggle = () => {
    if (isLoading) return;
    if (!isParentMenuOpen) closeOtherSubmenus('parent');
    setIsParentMenuOpen(!isParentMenuOpen);
  };

  const handleAssigneeMenuToggle = () => {
    if (isLoading) return;
    if (!isAssigneeMenuOpen) closeOtherSubmenus('assignee');
    setIsAssigneeMenuOpen(!isAssigneeMenuOpen);
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;

    const blockScrollOutsideSubmenu = (e: Event) => {
      if (isScrollTargetInsideSubmenu(e)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('wheel', blockScrollOutsideSubmenu, { passive: false });
    document.addEventListener('touchmove', blockScrollOutsideSubmenu, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      const savedScrollY = document.body.style.top;
      document.body.style.top = '';
      if (savedScrollY) {
        window.scrollTo(0, parseInt(savedScrollY, 10) * -1);
      }

      document.removeEventListener('wheel', blockScrollOutsideSubmenu);
      document.removeEventListener('touchmove', blockScrollOutsideSubmenu);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLoading || !closeOnOutsideClick) return;

      const target = event.target as Node;
      const clickedInsideMenu = menuRef.current?.contains(target) ?? false;

      const allSubmenus = document.querySelectorAll('[data-submenu="true"]');
      const clickedInsideSubmenu = Array.from(allSubmenus).some((submenu) =>
        submenu.contains(target)
      );

      const clickedInsideConfirmDialog = (target as HTMLElement).closest?.(
        '[data-confirm-dialog="true"]'
      );

      if (!clickedInsideMenu && !clickedInsideSubmenu && !clickedInsideConfirmDialog) {
        onCloseByClickOutside?.();
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isLoading) return;
        setIsStatusMenuOpen(false);
        setIsSprintMenuOpen(false);
        setIsEstimateMenuOpen(false);
        setIsParentMenuOpen(false);
        setIsAssigneeMenuOpen(false);
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeOnOutsideClick, isLoading, onClose, onCloseByClickOutside]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const apply = () => {
      const { height, width } = measureContextMenuLayoutSize(el);
      const next = resolveContextMenuViewportPosition({
        anchorRect,
        menuHeight: height,
        menuWidth: width,
        position,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      });
      el.style.left = `${next.left}px`;
      el.style.top = `${next.top}px`;
      setAnchorSide((prev) => (prev === next.anchorSide ? prev : next.anchorSide));
    };

    apply();
    const raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, [position, anchorRect]);

  const handleStatusSelect = async (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => {
    if (isLoading) return;

    setIsLoading(true);
    setPendingTransitionId(transitionId);

    try {
      await onStatusChange(taskIdForActions, transitionId, targetStatusKey, targetStatusDisplay, screenId);
      setIsStatusMenuOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to change status:', error);
      setIsLoading(false);
      setPendingTransitionId(null);
    }
  };

  const handleSprintSelect = async (sprintId: number) => {
    if (isLoading || sprintId === currentSprintId) return;

    const targetSprint = sprints.find((s) => s.id === sprintId);
    const sprintName = targetSprint?.name || `спринт ${sprintId}`;

    const confirmed = await confirm(
      `Вы уверены, что хотите перенести задачу "${taskIdForActions}" в спринт "${sprintName}"?`,
      {
        title: 'Перенос задачи в спринт',
        variant: 'default',
      }
    );

    if (!confirmed) {
      return;
    }

    setIsSprintMenuOpen(false);
    onClose();

    try {
      await onMoveToSprint(taskIdForActions, sprintId);
    } catch (error) {
      console.error('Failed to move task to sprint:', error);
      toast.error('Не удалось перенести задачу в спринт. Попробуйте ещё раз.');
    }
  };

  const handleParentSelect = async (parent: TaskParent | null) => {
    if (isLoading || !onParentChange) return;

    const currentKey = resolveTaskParentForMenu(task)?.key ?? null;
    const nextKey = parent?.key ?? null;
    if (currentKey === nextKey) {
      setIsParentMenuOpen(false);
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onParentChange(taskIdForActions, parent);
      setIsParentMenuOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to change parent:', error);
      setIsLoading(false);
    }
  };

  const handleRemoveFromSprint = async () => {
    if (isLoading) return;

    if (!onRemoveFromSprint) {
      console.error('onRemoveFromSprint is not defined!');
      onClose();
      return;
    }

    const confirmed = await confirmWithAction(
      `Вы уверены, что хотите убрать задачу "${taskIdForActions}" из текущего спринта?`,
      async () => {
        await onRemoveFromSprint(taskIdForActions);
      },
      {
        title: 'Удаление задачи из спринта',
        confirmText: 'Убрать',
        loadingText: 'Убираем...',
        variant: 'default',
      }
    );

    if (confirmed) {
      onClose();
    }
  };

  const handleRemoveFromPlan = () => {
    if (isLoading || !onRemoveFromPlan) return;
    onRemoveFromPlan(task.id);
    onClose();
  };

  const availableSprints = isBacklogTask
    ? sprints.filter((s) => !s.archived && (s.status === 'in_progress' || s.status === 'draft'))
    : sprints.filter((s) => s.id !== currentSprintId && !s.archived);

  return {
    menuRef,
    anchorSide,
    statusButtonRef,
    sprintButtonRef,
    estimateButtonRef,
    parentButtonRef,
    assigneeButtonRef,
    isLoading,
    pendingTransitionId,
    isStatusMenuOpen,
    isSprintMenuOpen,
    isEstimateMenuOpen,
    isParentMenuOpen,
    isAssigneeMenuOpen,
    taskIdForActions,
    availableSprints,
    DialogComponent,
    handleStatusMenuToggle,
    handleSprintMenuToggle,
    handleEstimateMenuToggle,
    handleParentMenuToggle,
    handleAssigneeMenuToggle,
    handleStatusSelect,
    handleSprintSelect,
    handleParentSelect,
    handleRemoveFromPlan,
    handleRemoveFromSprint,
  };
}
