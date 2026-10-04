'use client';

import type { BacklogFilterPerson } from '@/features/backlog/utils/backlogFilterPeople';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/contexts/LanguageContext';
import { getInitials } from '@/utils/displayUtils';

const VISIBLE_ASSIGNEE_COUNT = 5;

/** Кольцо не на самой кнопке: глобальный `button:focus { box-shadow: none }` снимал бы его до потери фокуса. */
function assigneeRingClass(selected: boolean): string {
  return `pointer-events-none absolute inset-0 rounded-full ring-2 ${
    selected ? 'ring-blue-500' : 'ring-ds-canvas'
  }`;
}

interface BacklogAssigneeFilterProps {
  people: BacklogFilterPerson[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export function BacklogAssigneeFilter({ people, selectedIds, onToggle }: BacklogAssigneeFilterProps) {
  const { t } = useI18n();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const ordered = useMemo(
    () =>
      [...people].sort((a, b) => {
        const aSelected = selectedIds.has(a.id) ? 0 : 1;
        const bSelected = selectedIds.has(b.id) ? 0 : 1;
        return aSelected - bSelected;
      }),
    [people, selectedIds]
  );
  const visible = ordered.slice(0, VISIBLE_ASSIGNEE_COUNT);
  const overflow = ordered.slice(VISIBLE_ASSIGNEE_COUNT);

  useEffect(() => {
    if (!overflowOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [overflowOpen]);

  if (people.length === 0) return null;

  return (
    <div ref={rootRef} aria-label={t('backlog.filters.assigneeAria')} className="relative flex items-center" role="group">
      {visible.map((person, index) => {
        const selected = selectedIds.has(person.id);
        return (
          <button
            key={person.id}
            aria-pressed={selected}
            className={`relative rounded-full ${index > 0 ? '-ml-1.5' : ''} ${selected ? 'z-10' : ''}`}
            title={person.name}
            type="button"
            onClick={() => onToggle(person.id)}
          >
            <span aria-hidden className={assigneeRingClass(selected)} />
            <Avatar
              avatarUrl={person.avatarUrl}
              initials={getInitials(person.name)}
              initialsVariant="default"
              size="sm"
              title={person.name}
            />
          </button>
        );
      })}
      {overflow.length > 0 ? (
        <button
          aria-expanded={overflowOpen}
          aria-label={t('backlog.filters.assigneeMoreAria', { count: overflow.length })}
          className="relative -ml-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-100"
          type="button"
          onClick={() => setOverflowOpen((open) => !open)}
        >
          <span
            aria-hidden
            className={assigneeRingClass(overflow.some((person) => selectedIds.has(person.id)))}
          />
          +{overflow.length}
        </button>
      ) : null}
      {overflowOpen && overflow.length > 0 ? (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {overflow.map((person) => {
            const selected = selectedIds.has(person.id);
            return (
              <button
                key={person.id}
                aria-pressed={selected}
                className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 ${
                  selected ? 'bg-blue-50 dark:bg-blue-950/40' : ''
                }`}
                type="button"
                onClick={() => onToggle(person.id)}
              >
                <Avatar
                  avatarUrl={person.avatarUrl}
                  initials={getInitials(person.name)}
                  initialsVariant="default"
                  size="sm"
                  title={person.name}
                />
                <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">{person.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
