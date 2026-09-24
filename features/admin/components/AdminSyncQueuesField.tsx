'use client';

import * as Popover from '@radix-ui/react-popover';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import {
  customSelectOptionRowClass,
  customSelectPopoverStyle,
  resolvePopoverWidth,
} from '@/components/customSelectHelpers';
import { CustomSelectTrigger } from '@/components/CustomSelectTrigger';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<Array<{ key: string; name: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [catalog, setCatalog] = useState<Array<{ key: string; name: string }>>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    if (open) {
      setSearchQuery('');
      setSearchHits([]);
      setSearchLoading(false);
      ensureCatalog();
      const triggerWidth = buttonRef.current?.getBoundingClientRect().width ?? 0;
      setPopoverWidth(resolvePopoverWidth(triggerWidth, false, undefined));
    }
    setIsOpen(open);
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

  const contentZIndex = ZIndex.modal + 1;
  const popoverStyle = customSelectPopoverStyle(false, contentZIndex, popoverWidth, popoverWidth);
  const hasSelection = teamQueueKeys.length > 0 || extraQueueKeys.length > 0;

  return (
    <div>
      <span className={label}>{t('admin.syncPage.queuesLabel')}</span>
      <Popover.Root modal={false} open={isOpen && !disabled} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <CustomSelectTrigger
            buttonRef={buttonRef}
            className="mt-1.5 w-full"
            disabled={disabled}
            isIconTrigger={false}
            isOpen={isOpen}
            size="default"
            title={t('admin.syncPage.queuesLabel')}
            triggerInner={
              <span
                className={`min-w-0 truncate whitespace-nowrap${
                  hasSelection ? '' : ' text-gray-500 dark:text-gray-400'
                }`}
              >
                {displayText}
              </span>
            }
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            avoidCollisions
            className={`flex max-h-72 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg outline-none dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
            collisionPadding={12}
            side="bottom"
            sideOffset={4}
            style={popoverStyle}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              requestAnimationFrame(() => {
                searchInputRef.current?.focus();
              });
            }}
          >
            <div className="shrink-0 border-b border-gray-200 px-2 py-2 dark:border-gray-600">
              <input
                ref={searchInputRef}
                autoComplete="off"
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400"
                placeholder={t('admin.syncPage.queuesSearchPlaceholder')}
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {options.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery.trim()
                    ? t('common.userSelector.empty')
                    : t('admin.syncPage.queuesPlaceholder')}
                </p>
              ) : (
                options.map((option) => {
                  const isSelected =
                    option.locked || extraQueueKeys.some((key) => key.trim() === option.key);
                  return (
                    <Button
                      key={option.key}
                      className={`h-auto min-h-0 w-full !items-center !justify-start !rounded-none border-0 !px-3 !py-2 text-left text-sm font-medium shadow-none ${customSelectOptionRowClass(false, isSelected)}`}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const next = toggleExtraSyncQueue(
                          extraQueueKeys,
                          teamQueueKeys,
                          option.key
                        );
                        if (next !== extraQueueKeys) onExtraQueueKeysChange([...next]);
                      }}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-transparent'
                          }`}
                          name="check"
                        />
                        <span className="min-w-0 truncate">{syncQueueOptionLabel(option)}</span>
                        {option.locked ? (
                          <span className="shrink-0 text-xs font-normal text-gray-500 dark:text-gray-400">
                            {t('admin.syncPage.queuesFromTeams')}
                          </span>
                        ) : null}
                      </span>
                    </Button>
                  );
                })
              )}
              {catalogLoading || searchLoading ? (
                <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('admin.syncPage.queuesSearching')}
                </p>
              ) : null}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <p className={`mt-1.5 text-xs ${muted}`}>{t('admin.syncPage.queuesHint')}</p>
    </div>
  );
}
