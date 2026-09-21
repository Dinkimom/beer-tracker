'use client';

import type { Task } from '@/types';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { StatusTag } from '@/components/StatusTag';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { getIssueTransitions, type TransitionItem } from '@/lib/beerTrackerApi';

import { TaskStatusSelectTransitionList } from './TaskStatusSelectTransitionList';

interface TaskStatusSelectProps {
  className?: string;
  disabled?: boolean;
  menuZIndex?: number;
  task: Pick<Task, 'id' | 'name' | 'originalStatus' | 'originalTaskId' | 'statusColorKey' | 'type'>;
  onTransitionSelect: (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => void;
}

/** Селектор статуса задачи: текущий StatusTag + список переходов из Tracker (как в контекстном меню). */
export function TaskStatusSelect({
  task,
  onTransitionSelect,
  disabled = false,
  className = '',
  menuZIndex = ZIndex.value('submenu'),
}: TaskStatusSelectProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [transitions, setTransitions] = useState<TransitionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadedForTaskIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadTransitions = useCallback(async () => {
    if (loadedForTaskIdRef.current === task.id) return;
    loadedForTaskIdRef.current = task.id;
    setIsLoading(true);
    try {
      const list = await getIssueTransitions(String(task.originalTaskId ?? task.id));
      setTransitions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load status transitions:', error);
      setTransitions([]);
    } finally {
      setIsLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (!isOpen) return;
    void loadTransitions();
  }, [isOpen, loadTransitions]);

  useEffect(() => {
    if (!isOpen) {
      loadedForTaskIdRef.current = null;
      setTransitions([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !menuRef.current || !buttonRef.current) return;

    const updatePosition = () => {
      if (!menuRef.current || !buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      menuRef.current.style.position = 'fixed';
      menuRef.current.style.top = `${rect.bottom + 4}px`;
      menuRef.current.style.left = `${rect.left}px`;
      menuRef.current.style.minWidth = `${rect.width}px`;
      menuRef.current.style.width = 'max-content';
      menuRef.current.style.maxWidth = `${Math.max(rect.width, Math.min(240, window.innerWidth - rect.left - 8))}px`;
      menuRef.current.style.zIndex = String(menuZIndex);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isLoading, transitions.length, menuZIndex]);

  if (!task.originalStatus) {
    return null;
  }

  return (
    <div ref={containerRef} className={`relative min-w-0 max-w-full ${className}`}>
      <Button
        ref={buttonRef}
        className={`!h-auto !min-h-0 w-full min-w-0 !justify-between !gap-1 !rounded-md !px-1.5 !py-1 hover:!border-gray-400 focus-visible:!border-blue-500 focus-visible:!ring-2 focus-visible:!ring-blue-500 dark:hover:!border-gray-500 ${
          isOpen ? '!border-gray-400 dark:!border-gray-500' : ''
        }`}
        disabled={disabled}
        type="button"
        variant="outline"
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
      >
        <StatusTag
          className="min-w-0 max-w-full truncate text-[10px]"
          status={task.originalStatus}
          statusColorKey={task.statusColorKey}
        />
        <Icon
          className={`h-3 w-3 shrink-0 text-gray-400 transition-transform duration-150 dark:text-gray-500 ${
            isOpen ? 'rotate-180' : ''
          }`}
          name="chevron-down"
        />
      </Button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={menuRef}
            className={`w-max rounded-lg border border-gray-200 bg-white py-1.5 px-1 shadow-2xl dark:border-gray-700 dark:bg-gray-800 ${ZIndex.class('submenu')}`}
          >
            <TaskStatusSelectTransitionList
              isLoading={isLoading}
              loadingLabel={t('task.statusSelect.loadingTransitions')}
              noTransitionsLabel={t('task.statusSelect.noTransitions')}
              task={task}
              transitions={transitions}
              onSelect={(transitionId, targetStatusKey, targetStatusDisplay, screenId) => {
                onTransitionSelect(transitionId, targetStatusKey, targetStatusDisplay, screenId);
                setIsOpen(false);
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
