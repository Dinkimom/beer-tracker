'use client';

import type { RegistryUserItem } from '@/lib/beerTrackerApi';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

import { getInitials } from './userSelectorDisplayHelpers';

interface MultiUserSelectorSelectedChipsProps {
  selectedUsers: RegistryUserItem[];
  onRemove: (trackerId: string) => void;
}

export function MultiUserSelectorSelectedChips({
  onRemove,
  selectedUsers,
}: MultiUserSelectorSelectedChipsProps) {
  if (selectedUsers.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {selectedUsers.map((user) => (
        <span
          key={user.trackerId}
          className="inline-flex items-center gap-1.5 max-w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <Avatar
            avatarUrl={user.avatarUrl}
            initials={getInitials(user.displayName)}
            size="sm"
          />
          <span className="truncate">{user.displayName}</span>
          <Button
            className="!h-5 !w-5 !min-h-0 !min-w-0 !rounded-sm !p-0"
            title="Убрать"
            type="button"
            variant="ghost"
            onClick={() => onRemove(user.trackerId)}
          >
            <Icon className="h-3 w-3" name="x" />
          </Button>
        </span>
      ))}
    </div>
  );
}
