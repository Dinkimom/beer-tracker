'use client';

import type { SidebarTabSettings } from '@/hooks/useLocalStorage';
import type { DragEndEvent } from '@dnd-kit/core';

import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { useIssueTrackerProviderCapabilities } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { SIDEBAR_INVALID_TAB_ENABLED } from '@/features/sidebar/hooks/useSidebarHeaderTabsHelpers';
import { useSidebarTabsSettingsStorage } from '@/hooks/useLocalStorage';

import { SortableSidebarTabItem } from './SortableSidebarTabItem';

const ALL_SIDEBAR_TAB_IDS = [
  'tasks',
  'invalid',
  'goals',
  'daily',
  'metrics',
  'bugs',
  'backlog',
] as const satisfies ReadonlyArray<SidebarTabSettings['id']>;

function allowedSidebarTabIds(bugsTabEnabled: boolean): ReadonlyArray<SidebarTabSettings['id']> {
  return ALL_SIDEBAR_TAB_IDS.filter(
    (id) =>
      (id !== 'bugs' || bugsTabEnabled) &&
      (id !== 'invalid' || SIDEBAR_INVALID_TAB_ENABLED)
  );
}

function defaultSidebarTabItems(bugsTabEnabled: boolean): SidebarTabSettings[] {
  return allowedSidebarTabIds(bugsTabEnabled).map((id) => ({ id, visible: true }));
}

function normalizeSidebarTabsSettings(
  prev: SidebarTabSettings[],
  bugsTabEnabled: boolean
): SidebarTabSettings[] {
  const allowedIds = allowedSidebarTabIds(bugsTabEnabled);
  const allowedSet = new Set<string>(allowedIds);
  const filtered = prev.filter((tab) => allowedSet.has(tab.id));
  if (filtered.length === 0) {
    return defaultSidebarTabItems(bugsTabEnabled);
  }

  const knownIds = new Set(filtered.map((tab) => tab.id));
  const missing = allowedIds.filter((id) => !knownIds.has(id)).map((id) => ({
    id,
    visible: true,
  }));

  return missing.length > 0 ? [...filtered, ...missing] : filtered;
}

interface SidebarTabsSettingsListProps {
  setSidebarTabsSettings: ReturnType<typeof useSidebarTabsSettingsStorage>[1];
  sidebarTabsSettings: ReturnType<typeof useSidebarTabsSettingsStorage>[0];
}

export function SidebarTabsSettingsList({
  sidebarTabsSettings,
  setSidebarTabsSettings,
}: SidebarTabsSettingsListProps) {
  const { t } = useI18n();
  const { supportsSlaBugs } = useIssueTrackerProviderCapabilities();
  const items = normalizeSidebarTabsSettings(sidebarTabsSettings, supportsSlaBugs);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSidebarTabsSettings((prev) => {
      const current = normalizeSidebarTabsSettings(prev, supportsSlaBugs);
      const oldIndex = current.findIndex((tab) => tab.id === active.id);
      const newIndex = current.findIndex((tab) => tab.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...current];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  };

  const handleToggleVisible = (id: string) => {
    setSidebarTabsSettings((prev) => {
      const current = normalizeSidebarTabsSettings(prev, supportsSlaBugs);
      return current.map((tab) =>
        tab.id === id ? { ...tab, visible: !tab.visible } : tab
      );
    });
  };

  return (
    <div className="mt-2 space-y-1.5">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((tab) => tab.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((tab, index) => (
            <SortableSidebarTabItem
              key={tab.id}
              id={tab.id}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              label={t(`sidebar.tabs.${tab.id}`)}
              visible={tab.visible}
              onToggleVisible={() => handleToggleVisible(tab.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
