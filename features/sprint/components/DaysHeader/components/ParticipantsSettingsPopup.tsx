'use client';

import type { RegistryUserItem } from '@/lib/api/types';
import type { Developer } from '@/types';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AnchoredPopover } from '@/components/AnchoredPopover';
import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { DevelopersManagementContent } from '@/features/sidebar/components/DevelopersManagement';
import { TeamSwimlaneSettingsItem } from '@/features/sprint/components/DaysHeader/components/TeamSwimlaneSettingsItem';
import { UserSelector } from '@/features/sprint/components/SprintPlanner/components/UserSelector';
import {
  addTeamMemberForBoard,
  fetchTeamMembersForBoard,
  searchBoardTeamRegistry,
} from '@/lib/api/teamMembers';
import {
  isTeamSwimlaneRowHidden,
  TEAM_SWIMLANE_ASSIGNEE_ID,
} from '@/lib/swimlane/teamSwimlaneAssignee';

interface ParticipantsSettingsPopupProps {
  boardId?: number | null;
  developers: Developer[];
  developersManagement: {
    handleDragEnd: (activeId: string, overId: string) => void;
    hiddenIds: Set<string>;
    hideAllDevelopers: () => void;
    setSortBy: (sort: 'custom' | 'name' | 'sp' | 'tasks' | 'tp') => void;
    showAllDevelopers: () => void;
    sortBy: 'custom' | 'name' | 'sp' | 'tasks' | 'tp';
    sortedDevelopers: Developer[];
    toggleDeveloperVisibility: (id: string) => void;
  };
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  onRemoveParticipant?: (
    developerId: string,
    knownDisplayName?: string | null
  ) => Promise<boolean>;
}

export function ParticipantsSettingsPopup({
  boardId,
  developers,
  developersManagement,
  isOpen,
  onRemoveParticipant,
  onClose,
  position,
}: ParticipantsSettingsPopupProps) {
  const { t } = useI18n();
  const [removingDeveloperId, setRemovingDeveloperId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [locallyRemovedIds, setLocallyRemovedIds] = useState<Set<string>>(new Set());
  const [rosterOverride, setRosterOverride] = useState<Developer[] | null>(null);
  const [selectedStaffUid, setSelectedStaffUid] = useState('');
  const [selectedRegistryUser, setSelectedRegistryUser] = useState<RegistryUserItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLocallyRemovedIds(new Set());
      setRemoveError(null);
      setRemovingDeveloperId(null);
      setSelectedStaffUid('');
      setSelectedRegistryUser(null);
      setIsAdding(false);
      setRosterOverride(null);
    }
  }, [isOpen]);

  /**
   * Состав после добавления или удаления приходит с сервера в своём порядке: держим порядок доски,
   * новые люди встают в конец — строки списка не «прыгают».
   */
  const orderedRoster = useMemo(() => {
    if (!rosterOverride) return null;
    const boardOrder = new Map(developersManagement.sortedDevelopers.map((d, index) => [d.id, index]));
    const position = (id: string) => boardOrder.get(id) ?? boardOrder.size;
    return [...rosterOverride].sort((a, b) => position(a.id) - position(b.id));
  }, [developersManagement.sortedDevelopers, rosterOverride]);

  const developersInPopup = useMemo(() => {
    return (orderedRoster ?? developers).filter((d) => !locallyRemovedIds.has(d.id));
  }, [developers, locallyRemovedIds, orderedRoster]);

  const developersManagementForPopup = useMemo(() => {
    const sortedDevelopers = orderedRoster
      ? orderedRoster.filter((d) => !locallyRemovedIds.has(d.id))
      : developersManagement.sortedDevelopers.filter((d) => !locallyRemovedIds.has(d.id));
    return {
      ...developersManagement,
      sortedDevelopers,
    };
  }, [developersManagement, locallyRemovedIds, orderedRoster]);

  const searchRegistry = useCallback(
    async (query: string, signal?: AbortSignal): Promise<RegistryUserItem[]> => {
      if (boardId == null) return [];
      const items = await searchBoardTeamRegistry(boardId, query, signal);
      return items.map((item) => ({
        avatarUrl: item.avatarUrl,
        displayName: item.displayName,
        email: item.email,
        staffUid: item.staffUid,
        trackerId: item.staffUid,
      }));
    },
    [boardId]
  );

  const canAddCandidate =
    boardId != null && Boolean(selectedStaffUid.trim()) && !isAdding;

  const handleAddCandidate = async () => {
    const staffUid = selectedStaffUid.trim();
    if (!staffUid || boardId == null) {
      return;
    }
    try {
      setIsAdding(true);
      await addTeamMemberForBoard(boardId, { staffUid });
      try {
        setRosterOverride(await fetchTeamMembersForBoard(boardId));
      } catch {
        /* список подтянется через invalidate планера */
      }
      toast.success(
        t('sprintPlanner.participants.memberAdded', {
          name: selectedRegistryUser?.displayName ?? staffUid,
        })
      );
      setSelectedStaffUid('');
      setSelectedRegistryUser(null);
      window.dispatchEvent(new CustomEvent('planner-members-updated'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('sprintPlanner.participants.addFailed')
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnchoredPopover
      anchor={{ x: position.left, y: position.top }}
      className="flex max-h-[70vh] w-[480px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden"
      open={isOpen}
      sideOffset={0}
      onDismiss={() => {
        // Пока участника удаляют (идёт подтверждение или запрос), панель не закрывается.
        if (!removingDeveloperId) onClose();
      }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t('sprintPlanner.participants.addTitle')}
          </h3>
          <HeaderIconButton
            aria-label={t('common.close')}
            className="!h-6 !w-6"
            disabled={Boolean(removingDeveloperId)}
            type="button"
            onClick={onClose}
          >
            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" name="x" />
          </HeaderIconButton>
        </div>
        {removeError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{removeError}</p>
        )}
        <div className="mt-3 min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <UserSelector
              allowClear
              className="min-w-0 flex-1"
              placeholder={t('sprintPlanner.participants.selectPlaceholder')}
              searchFn={searchRegistry}
              selectedPreview={selectedRegistryUser}
              value={selectedStaffUid}
              onChange={(staffUid, user) => {
                setSelectedStaffUid(staffUid);
                setSelectedRegistryUser(user ?? null);
              }}
            />
            <Button
              className="shrink-0 whitespace-nowrap"
              disabled={!canAddCandidate}
              type="button"
              variant="primary"
              onClick={() => void handleAddCandidate()}
            >
              {isAdding
                ? t('sprintPlanner.participants.adding')
                : t('sprintPlanner.participants.addButton')}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 overflow-y-auto flex-1 min-h-0">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t('sprintPlanner.participants.listTitle')}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              type="button"
              onClick={developersManagement.showAllDevelopers}
            >
              {t('sprintPlanner.participants.showAll')}
            </button>
            <button
              className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              type="button"
              onClick={developersManagement.hideAllDevelopers}
            >
              {t('sprintPlanner.participants.hideAll')}
            </button>
          </div>
        </div>
        {developersManagement && (
          <>
            <div
              className={
                developersInPopup.length > 0
                  ? 'border-b border-gray-200 dark:border-gray-700'
                  : undefined
              }
            >
              <TeamSwimlaneSettingsItem
                isHidden={isTeamSwimlaneRowHidden(developersManagement.hiddenIds)}
                onToggleVisibility={() => {
                  developersManagement.toggleDeveloperVisibility(TEAM_SWIMLANE_ASSIGNEE_ID);
                }}
              />
            </div>
            {developersInPopup.length > 0 ? (
              <DevelopersManagementContent
                developers={developersInPopup}
                developersManagement={developersManagementForPopup}
                removingDeveloperId={removingDeveloperId}
                onRemoveDeveloper={
                  onRemoveParticipant
                    ? async (developer) => {
                        try {
                          setRemoveError(null);
                          setRemovingDeveloperId(developer.id);
                          const removed = await onRemoveParticipant(
                            developer.id,
                            developer.name
                          );
                          if (!removed) {
                            return;
                          }
                          setLocallyRemovedIds((prev) => {
                            const next = new Set(prev);
                            next.add(developer.id);
                            return next;
                          });
                          if (boardId != null) {
                            try {
                              setRosterOverride(await fetchTeamMembersForBoard(boardId));
                              setLocallyRemovedIds(new Set());
                            } catch {
                              /* оставляем локальное скрытие */
                            }
                          }
                        } catch (error) {
                          setRemoveError(
                            error instanceof Error
                              ? error.message
                              : t('sprintPlanner.participants.removeFailed')
                          );
                        } finally {
                          setRemovingDeveloperId(null);
                        }
                      }
                    : undefined
                }
              />
            ) : null}
          </>
        )}
      </div>
    </AnchoredPopover>
  );
}
