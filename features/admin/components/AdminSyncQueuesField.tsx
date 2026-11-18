'use client';

import { useMemo, useRef, useState } from 'react';

import { SearchableMultiSelect } from '@/components/SearchableMultiSelect';
import { useI18n } from '@/contexts/LanguageContext';
import {
  buildSyncQueueMenuOptions,
  syncQueueOptionLabel,
  syncQueuesTriggerLabel,
  toggleExtraSyncQueue,
} from '@/features/admin/adminSyncQueueOptions';
import { label, muted } from '@/features/admin/adminUiTokens';
import { fetchAdminTrackerCatalog } from '@/lib/api/admin/teams';
import { searchQueues } from '@/lib/api/queues';

interface AdminSyncQueuesFieldProps {
  connectOrgId: string;
  disabled?: boolean;
  extraQueueKeys: string[];
  teamQueueKeys: string[];
  onExtraQueueKeysChange: (queueKeys: string[]) => void;
}

export function AdminSyncQueuesField({
  connectOrgId,
  disabled = false,
  extraQueueKeys,
  onExtraQueueKeysChange,
  teamQueueKeys,
}: AdminSyncQueuesFieldProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<Array<{ key: string; name: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [catalog, setCatalog] = useState<Array<{ key: string; name: string }>>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogStarted = useRef(false);
  const searchTimer = useRef<number | null>(null);
  const searchSeq = useRef(0);

  const options = useMemo(
    () =>
      buildSyncQueueMenuOptions({
        catalog,
        extraKeys: extraQueueKeys,
        query: searchQuery,
        searchHits,
        teamKeys: teamQueueKeys,
      }),
    [catalog, extraQueueKeys, searchHits, searchQuery, teamQueueKeys]
  );
  const displayText = syncQueuesTriggerLabel(
    teamQueueKeys,
    extraQueueKeys,
    t('admin.syncPage.queuesPlaceholder'),
    (count) => t('admin.syncPage.queuesSelectedCount', { count })
  );

  const ensureCatalog = () => {
    if (catalogStarted.current) return;
    catalogStarted.current = true;
    setCatalogLoading(true);
    fetchAdminTrackerCatalog(connectOrgId)
      .then((data) => setCatalog(data.queues))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    const query = value.trim();
    const seq = searchSeq.current + 1;
    searchSeq.current = seq;
    if (!query) {
      setSearchHits([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = window.setTimeout(() => {
      searchQueues(query)
        .then((items) => {
          if (searchSeq.current !== seq) return;
          setSearchHits(items);
          setSearchLoading(false);
        })
        .catch(() => {
          if (searchSeq.current !== seq) return;
          setSearchLoading(false);
        });
    }, 250);
  };

  const hasSelection = teamQueueKeys.length > 0 || extraQueueKeys.length > 0;

  return (
    <div>
      <span className={label}>{t('admin.syncPage.queuesLabel')}</span>
      <div className="mt-1.5">
        <SearchableMultiSelect
          disabled={disabled}
          displayText={displayText}
          idleEmptyLabel={t('admin.syncPage.queuesPlaceholder')}
          loadingLabel={catalogLoading || searchLoading ? t('admin.syncPage.queuesSearching') : undefined}
          options={options.map((option) => ({
            key: option.key,
            label: syncQueueOptionLabel(option),
            note: option.locked ? t('admin.syncPage.queuesFromTeams') : undefined,
            selected: option.locked || extraQueueKeys.some((key) => key.trim() === option.key),
          }))}
          placeholderShown={!hasSelection}
          searchPlaceholder={t('admin.syncPage.queuesSearchPlaceholder')}
          title={t('admin.syncPage.queuesLabel')}
          onOpen={ensureCatalog}
          onQueryChange={handleSearchChange}
          onToggle={(queueKey) => {
            const next = toggleExtraSyncQueue(extraQueueKeys, teamQueueKeys, queueKey);
            if (next !== extraQueueKeys) onExtraQueueKeysChange([...next]);
          }}
        />
      </div>
      <p className={`mt-1.5 text-xs ${muted}`}>{t('admin.syncPage.queuesHint')}</p>
    </div>
  );
}
