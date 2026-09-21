'use client';

import * as Popover from '@radix-ui/react-popover';
import { useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';

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
          className="!h-6 !w-6 !min-h-6 !min-w-6 !justify-center !gap-0 !rounded-md !border-0 !bg-transparent !px-0 !py-0 shadow-none hover:!bg-gray-100 dark:hover:!bg-gray-700"
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
          className={`max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg outline-none dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
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
          {options.map((option) => {
            const isSelected = option.value === issueType;
            return (
              <Button
                key={option.value}
                className={`h-auto min-h-0 w-full !rounded-none border-0 !items-center !justify-start !px-3 !py-2 text-left text-sm font-medium shadow-none ${
                  isSelected
                    ? '!bg-blue-50 !text-blue-700 hover:!bg-blue-50 dark:!bg-blue-900/30 dark:!text-blue-300 dark:hover:!bg-blue-900/30'
                    : 'text-gray-700 hover:!bg-gray-50 dark:text-gray-300 dark:hover:!bg-gray-700'
                }`}
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="flex min-w-0 items-center gap-2.5 whitespace-nowrap">
                  <IssueTypeIcon className="h-4 w-4 shrink-0" type={option.value} />
                  <span>{option.label}</span>
                </span>
              </Button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
