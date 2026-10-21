'use client';

import * as Popover from '@radix-ui/react-popover';
import { useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import {
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  FLOATING_MENU_GLASS_SHELL,
  MENU_PANEL_PADDING,
  MENU_ROW,
  MENU_ROW_CHECK,
  MENU_ROW_STACK,
} from '@/features/context-menu/contextMenuClasses';

interface QuickAddIssueTypeOption {
  label: string;
  value: string;
}

interface QuickAddIssueTypeSelectProps {
  disabled?: boolean;
  issueType: string;
  menuZIndex?: number;
  options: QuickAddIssueTypeOption[];
  title?: string;
  onChange: (type: string) => void;
}

export function QuickAddIssueTypeSelect({
  disabled = false,
  issueType,
  menuZIndex,
  options,
  title,
  onChange,
}: QuickAddIssueTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const [popoverMinWidth, setPopoverMinWidth] = useState<number | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedLabel =
    options.find((option) => option.value === issueType)?.label ?? title ?? issueType;

  const handleOpenChange = (next: boolean) => {
    if (disabled) {
      return;
    }
    if (next) {
      setPopoverMinWidth(triggerRef.current?.getBoundingClientRect().width);
    }
    setOpen(next);
  };

  return (
    <Popover.Root modal={false} open={open && !disabled} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <Button
          ref={triggerRef}
          aria-expanded={open}
          aria-label={selectedLabel}
          className={`!h-6 !w-6 !min-h-6 !min-w-6 !justify-center !gap-0 !rounded-md !border-0 !bg-transparent !px-0 !py-0 shadow-none ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER}`}
          disabled={disabled}
          title={title}
          type="button"
          variant="ghost"
        >
          <IssueTypeIcon className="h-6 w-6 shrink-0" type={issueType} />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          avoidCollisions
          className={`relative outline-none ${FLOATING_MENU_GLASS_SHELL} ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={12}
          side="bottom"
          sideOffset={4}
          style={{
            zIndex: menuZIndex,
            width: 'max-content',
            minWidth: popoverMinWidth,
            maxWidth: 'min(100vw - 16px, 20rem)',
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className={`max-h-60 overflow-y-auto overscroll-contain scrollbar-thin-custom ${MENU_PANEL_PADDING} ${MENU_ROW_STACK}`}>
            {options.map((option) => {
              const isSelected = option.value === issueType;
              return (
                <Button
                  key={option.value}
                  aria-current={isSelected || undefined}
                  className={`${MENU_ROW} whitespace-nowrap`}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <IssueTypeIcon className="h-4 w-4 shrink-0" type={option.value} />
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {isSelected ? <Icon className={MENU_ROW_CHECK} name="check" /> : null}
                </Button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
