'use client';

import type { Developer } from '@/types';

import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { SortableDeveloperItem } from '@/features/sidebar/components/SortableDeveloperItem';

interface DevelopersManagementContentProps {
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
  hideAvatar?: boolean;
  removingDeveloperId?: string | null;
  canRemoveDeveloper?: (developer: Developer) => boolean;
  onRemoveDeveloper?: (developer: Developer) => Promise<void> | void;
  renderItemName?: (developer: Developer) => React.ReactNode;
}

export function DevelopersManagementContent({
  developers,
  canRemoveDeveloper,
  developersManagement,
  hideAvatar = false,
  removingDeveloperId = null,
  onRemoveDeveloper,
  renderItemName,
}: DevelopersManagementContentProps) {
  const developersToShow = developersManagement.sortedDevelopers || developers;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    developersManagement.handleDragEnd(active.id as string, over.id as string);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div>
        <SortableContext
          items={developersToShow.map(d => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {developersToShow.map((dev) => {
            const isHidden = developersManagement.hiddenIds.has(dev.id);
            return (
              <SortableDeveloperItem
                key={dev.id}
                developer={dev}
                hideAvatar={hideAvatar}
                isHidden={isHidden}
                isRemoving={removingDeveloperId === dev.id}
                nameContent={renderItemName?.(dev)}
                onRemove={
                  onRemoveDeveloper && (canRemoveDeveloper?.(dev) ?? true)
                    ? () => {
                        void onRemoveDeveloper(dev);
                      }
                    : undefined
                }
                onToggleVisibility={() => developersManagement.toggleDeveloperVisibility(dev.id)}
              />
            );
          })}
        </SortableContext>
      </div>
    </DndContext>
  );
}
