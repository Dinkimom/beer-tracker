'use client';

import * as Popover from '@radix-ui/react-popover';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import { getInitials } from '@/utils/displayUtils';

const TRIGGER_CLASS =
  'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=open]:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15 dark:data-[state=open]:bg-white/10';

const PANEL_CLASS = [
  'z-[80] flex max-w-56 items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 shadow-lg ring-1 ring-black/10 outline-none',
  'dark:bg-gray-800 dark:ring-white/10',
  OVERLAY_FLOATING_ANIMATION,
].join(' ');

interface RetroCardAuthorButtonProps {
  avatarUrl?: string;
  name: string;
}

export function RetroCardAuthorButton({ avatarUrl, name }: RetroCardAuthorButtonProps) {
  const { t } = useI18n();

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t('retro.showAuthor')}
        className={TRIGGER_CLASS}
        type="button"
        onPointerDown={stopPointer}
      >
        <Icon className="h-3.5 w-3.5" name="user" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className={PANEL_CLASS}
          side="top"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDown={stopPointer}
        >
          <Avatar
            avatarUrl={avatarUrl}
            initials={getInitials(name)}
            initialsVariant="default"
            size="xs"
          />
          <span className="min-w-0 truncate text-xs font-medium text-gray-800 dark:text-gray-100">{name}</span>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function stopPointer(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
