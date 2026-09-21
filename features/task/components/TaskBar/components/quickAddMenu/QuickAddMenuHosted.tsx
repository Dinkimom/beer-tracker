'use client';

import type { QuickAddMode, QuickAddPickerItem } from './types';
import type { ReactNode } from 'react';

import { QUICK_ADD_KIND_PICKER_WIDTH_PX, QUICK_ADD_MENU_MIN_WIDTH_PX } from '@/hooks/useFollowAnchorRect';

import { QuickAddAnchoredPopover } from '../QuickAddAnchoredPopover';

import { QuickAddMenuHeader } from './QuickAddMenuHeader';
import { QuickAddMenuKindPicker } from './QuickAddMenuKindPicker';
import { QuickAddMenuLoader } from './QuickAddMenuLoader';

export interface QuickAddMenuHostedProps {
  allowAutoFocus?: boolean;
  anchorRect: DOMRect;
  canReturnToPicker?: boolean;
  form: ReactNode;
  formMode: QuickAddMode;
  isPickerStep: boolean;
  isSubmitting: boolean;
  minWidth?: number;
  pickerItems: readonly QuickAddPickerItem[];
  pickerTitle?: string;
  showLoader?: boolean;
  onBack?: () => void;
  onClose: () => void;
  onSelectMode: (mode: QuickAddMode) => void;
}

export function QuickAddMenuHosted({
  allowAutoFocus = false,
  anchorRect,
  canReturnToPicker = false,
  form,
  formMode,
  isPickerStep,
  isSubmitting,
  minWidth,
  onBack,
  onClose,
  onSelectMode,
  pickerItems,
  pickerTitle,
  showLoader = false,
}: QuickAddMenuHostedProps) {
  const panelMinWidth = isPickerStep
    ? QUICK_ADD_KIND_PICKER_WIDTH_PX
    : (minWidth ?? QUICK_ADD_MENU_MIN_WIDTH_PX);

  let body: ReactNode;
  if (isPickerStep) {
    body = (
      <QuickAddMenuKindPicker
        disabled={isSubmitting}
        items={pickerItems}
        title={pickerTitle}
        onClose={onClose}
        onSelect={onSelectMode}
      />
    );
  } else if (showLoader) {
    body = <QuickAddMenuLoader disabled={isSubmitting} onClose={onClose} />;
  } else {
    body = (
      <>
        <QuickAddMenuHeader
          disabled={isSubmitting}
          mode={formMode}
          onBack={canReturnToPicker ? onBack : undefined}
          onClose={onClose}
        />
        {form}
      </>
    );
  }

  return (
    <QuickAddAnchoredPopover
      allowAutoFocus={allowAutoFocus}
      anchorRect={anchorRect}
      minWidth={panelMinWidth}
      onEscape={onClose}
    >
      <div>{body}</div>
    </QuickAddAnchoredPopover>
  );
}
