'use client';

import { useMemo, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

import { trackerStatusMappingEmptyTitle } from '../trackerStatusMappingEmptyState';

import { AdminStatusPaletteSelect } from './AdminStatusPaletteSelect';
import { TrackerStatusTitleCell } from './TrackerStatusTitleCell';

interface TrackerStatusMappingSection {
  id: string;
  rows: Array<{
    display: string;
    /** Unique identity for palette overrides (status id when available). */
    key: string;
    /** Tracker name key — shown in the subtitle; may collide across statuses. */
    nameKey?: string;
    paletteKey?: string;
    statusTypeKey?: string;
  }>;
  title: string;
}

interface TrackerStatusMappingPanelProps {
  isEmpty: boolean;
  metaLoading: boolean;
  mutedClass: string;
  sections: TrackerStatusMappingSection[];
  getStoredPaletteKey: (statusKey: string) => string;
  onPaletteChange: (statusKey: string, paletteKey: string) => void;
}

export function TrackerStatusMappingPanel({
  getStoredPaletteKey,
  isEmpty,
  metaLoading,
  mutedClass,
  onPaletteChange,
  sections,
}: TrackerStatusMappingPanelProps) {
  const { t } = useI18n();
  const [statusSearch, setStatusSearch] = useState('');
  const searchNeedle = statusSearch.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!searchNeedle) {
      return sections;
    }
    return sections
      .map((section) => ({
        ...section,
        rows: section.rows.filter((row) => {
          const haystack = `${row.display} ${row.key} ${row.statusTypeKey ?? ''}`.toLowerCase();
          return haystack.includes(searchNeedle);
        }),
      }))
      .filter((section) => section.rows.length > 0);
  }, [searchNeedle, sections]);
  const hasRowsForRender = filteredSections.length > 0;
  const emptyTitle = trackerStatusMappingEmptyTitle({
    isEmpty,
    metaLoading,
    searchNeedle,
    t,
  });

  return (
    <>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('admin.plannerIntegration.statusMapping.title')}
        </h3>
        <p className={`mt-0.5 text-xs ${mutedClass}`}>
          {t('admin.plannerIntegration.statusMapping.subtitle')}
        </p>
        <div className="mt-3 space-y-3">
          {!isEmpty ? (
            <div className="px-0.5">
              <input
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                placeholder={t('admin.plannerIntegration.searchField')}
                type="search"
                value={statusSearch}
                onChange={(e) => setStatusSearch(e.target.value)}
              />
            </div>
          ) : null}
          {isEmpty || !hasRowsForRender ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 px-4 py-6 text-center dark:border-gray-600 dark:bg-gray-950/20">
              <p className="text-sm text-gray-700 dark:text-gray-200">{emptyTitle}</p>
              <p className={`mx-auto mt-1 max-w-md text-xs ${mutedClass}`}>
                {!isEmpty && searchNeedle
                  ? 'Измените поисковый запрос'
                  : t('admin.plannerIntegration.statusMapping.hintConnection')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* overflow-clip: sticky headers keep parent border-radius */}
              <div className="overflow-clip rounded-lg border border-gray-200/80 dark:border-gray-600">
                <div
                  className="touch-pan-y max-h-[62vh] overflow-y-auto text-sm"
                  style={{ overscrollBehaviorY: 'auto' }}
                >
                  {filteredSections.map((section, sectionIdx) => (
                    <div
                      key={section.id}
                      className={
                        sectionIdx > 0
                          ? 'border-t border-gray-200/80 dark:border-gray-600'
                          : ''
                      }
                    >
                      <div className="sticky top-0 z-[2] rounded-t-lg border-b border-gray-200/80 bg-gray-100/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700 backdrop-blur dark:border-gray-600 dark:bg-gray-700/95 dark:text-gray-200">
                        {section.title}
                        <span className="ml-2 opacity-70">
                          ({section.rows.length})
                        </span>
                      </div>
                      <ul className="divide-y divide-gray-200/80 dark:divide-gray-600">
                        {section.rows.map((row) => (
                          <li
                            key={row.key}
                            className="grid gap-2 bg-white/40 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:bg-gray-800/40 dark:hover:bg-gray-700/50 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-4"
                          >
                            <div className="flex min-w-0 flex-1 items-center">
                              <TrackerStatusTitleCell
                                display={row.display}
                                mutedClass={mutedClass}
                                statusKey={row.nameKey ?? row.key}
                                statusTypeKey={row.statusTypeKey}
                              />
                            </div>
                            <div className="w-full sm:w-[260px]">
                              <AdminStatusPaletteSelect
                                className="w-full"
                                statusKey={row.nameKey ?? row.key}
                                statusTypeKey={row.statusTypeKey}
                                storedPaletteKey={
                                  row.paletteKey ?? getStoredPaletteKey(row.key)
                                }
                                onPaletteChange={(next) =>
                                  onPaletteChange(row.key, next)
                                }
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  );
}
