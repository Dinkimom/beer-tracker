'use client';

import { useMemo, useState } from 'react';

import { Icon } from '@/components/Icon';
import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';
import { formatQuarterYear, getQuarterAndYear } from '@/features/quarterly-planning-v2/utils/quarterGrouping';
import { formatEpicCountLabel } from '@/lib/i18n/epicCountLabel';

import { EpicsSidebarEpicRow } from './EpicsSidebarEpicRow';

interface EpicListEntry {
  createdAt: string;
  id: string;
  name?: string;
  originalStatus?: string;
  status?: string;
  type?: string;
}

function epicMatchesSearch(epic: EpicListEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (epic.name ?? '').toLowerCase();
  return name.includes(q) || epic.id.toLowerCase().includes(q);
}

interface QuarterGroup {
  epics: EpicListEntry[];
  quarter: number;
  year: number;
}

function groupEpicsByQuarter(epics: EpicListEntry[]): QuarterGroup[] {
  const byQuarter = new Map<string, QuarterGroup['epics']>();
  epics.forEach((epic) => {
    const createdAt = new Date(epic.createdAt);
    const { quarter, year } = getQuarterAndYear(createdAt);
    const key = `${year}-Q${quarter}`;
    if (!byQuarter.has(key)) byQuarter.set(key, []);
    byQuarter.get(key)!.push(epic);
  });
  const result: QuarterGroup[] = [];
  byQuarter.forEach((epicsInQuarter, key) => {
    const [year, quarter] = key.split('-Q').map(Number);
    result.push({ year, quarter, epics: epicsInQuarter });
  });
  result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });
  return result;
}

function epicsSidebarFilteredEmptyMessage(
  epicsCount: number,
  hasSearchQuery: boolean,
  t: (key: string) => string
): string {
  if (epicsCount === 0) {
    return t('planning.quarterlyV2.sidebarEmptyNoEpicsOnBoard');
  }
  if (hasSearchQuery) {
    return t('planning.quarterlyV2.epicsSidebarSearchEmpty');
  }
  return t('planning.quarterlyV2.sidebarEmptyAllInPlan');
}

interface EpicsSidebarProps {
  /** Все эпики доски (опционально; сейчас может быть пусто) */
  epics: EpicListEntry[];
  /** Ключи эпиков, уже добавленных в план */
  planEpicKeys: Set<string>;
  onAddEpic: (epicKey: string) => void;
}

export function EpicsSidebar({
  epics,
  planEpicKeys,
  onAddEpic,
}: EpicsSidebarProps) {
  const { t } = useI18n();
  const [collapsedQuarters, setCollapsedQuarters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEpics = useMemo(
    () => epics.filter((epic) => epicMatchesSearch(epic, searchQuery)),
    [epics, searchQuery]
  );

  const availableEpics = useMemo(
    () => filteredEpics.filter((f) => !planEpicKeys.has(f.id)),
    [filteredEpics, planEpicKeys]
  );

  const hasSearchQuery = searchQuery.trim().length > 0;

  const quarterGroups = useMemo(() => groupEpicsByQuarter(availableEpics), [availableEpics]);

  const toggleQuarter = (quarterKey: string) => {
    setCollapsedQuarters((prev) => {
      const next = new Set(prev);
      if (next.has(quarterKey)) next.delete(quarterKey);
      else next.add(quarterKey);
      return next;
    });
  };

  function renderEpicsSidebarContent() {
    if (filteredEpics.length === 0) {
      return (
        <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
          {epicsSidebarFilteredEmptyMessage(epics.length, hasSearchQuery, t)}
        </div>
      );
    }
    if (availableEpics.length === 0) {
      if (hasSearchQuery) {
        return null;
      }
      return (
        <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
          {t('planning.quarterlyV2.sidebarEmptyAllInPlan')}
        </div>
      );
    }
    return quarterGroups.map((group) => {
      const quarterKey = `${group.year}-Q${group.quarter}`;
      const isCollapsed = collapsedQuarters.has(quarterKey);
      const count = group.epics.length;
      return (
        <div key={quarterKey} className="space-y-0">
          <button
            className="flex w-full items-center gap-2 border-0 bg-gray-100/80 px-2 py-2 text-left transition-colors hover:bg-gray-200/90 dark:bg-gray-700/40 dark:hover:bg-gray-700/70"
            type="button"
            onClick={() => toggleQuarter(quarterKey)}
          >
            <Icon
              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-gray-400 ${isCollapsed ? '' : 'rotate-90'}`}
              name="chevron-right"
            />
            <span className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-gray-200">
              {formatQuarterYear(group.quarter, group.year)}
            </span>
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-gray-600/50">
              {formatEpicCountLabel(count, t)}
            </span>
          </button>
          {!isCollapsed && (
            <div>
              {group.epics.map((epic) => (
                <EpicsSidebarEpicRow
                  key={epic.id}
                  addEpicAria={t('planning.quarterlyV2.addEpicToPlanAria')}
                  addEpicTitle={t('planning.quarterlyV2.addEpicToPlanTitle')}
                  epic={epic}
                  onAddEpic={onAddEpic}
                />
              ))}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-gray-200 px-2 py-2 dark:border-gray-700">
        <SearchInput
          placeholder={t('planning.quarterlyV2.epicsSidebarSearchPlaceholder')}
          size="sm"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pt-2">{renderEpicsSidebarContent()}</div>
    </div>
  );
}
