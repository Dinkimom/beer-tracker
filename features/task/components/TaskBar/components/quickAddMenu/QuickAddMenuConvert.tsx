'use client';

import type { QuickAddMenuIssueMode } from './QuickAddMenuTypes';
import type { QuickAddMode, QuickAddPickerItem } from './types';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { FeatureLaneConvertNewFields } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';
import type { Task } from '@/types';
import type { ReactElement } from 'react';

import * as Popover from '@radix-ui/react-popover';
import { useLayoutEffect, useRef, useState } from 'react';

import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { FeatureLaneConvertNewPanel } from '@/features/sprint/components/SprintPlanner/feature-lanes/FeatureLaneConvertNewPanel';
import { QUICK_ADD_KIND_PICKER_WIDTH_PX, QUICK_ADD_MENU_MIN_WIDTH_PX } from '@/hooks/useFollowAnchorRect';

import { useQuickAddIssueSearch } from './hooks/useQuickAddIssueSearch';
import { QuickAddMenuExistingPanel } from './QuickAddMenuExistingPanel';
import { QuickAddMenuHeader } from './QuickAddMenuHeader';
import { QuickAddMenuKindPicker } from './QuickAddMenuKindPicker';

const EMPTY_EXCLUDED_KEYS = new Set<string>();

type ConvertStep = 'existing' | 'new' | 'picker';

function preventConvertFormAutoFocus(event: Event, step: ConvertStep): void {
  if (step !== 'picker') {
    event.preventDefault();
  }
}

function isNestedRadixFloatingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-radix-popper-content-wrapper]'));
}

function toPickerItems(modes: readonly QuickAddMenuIssueMode[]): QuickAddPickerItem[] {
  return modes.map((mode) => ({ kind: 'mode', mode }));
}

export interface QuickAddMenuConvertProps {
  addLabel: string;
  boardId: number;
  contentAlign?: 'center' | 'start';
  excludedIssueKeys?: ReadonlySet<string>;
  hintNew: string;
  isSubmitting: boolean;
  modeLabelKeys?: Partial<Record<QuickAddMenuIssueMode, string>>;
  modes: readonly QuickAddMenuIssueMode[];
  parentCandidates?: boolean;
  queueOptions: QuickAddQueueOption[];
  submitLabel?: string;
  trigger: ReactElement;
  onAddDraft?: () => void;
  onSelectExisting: (task: Task) => Promise<boolean>;
  onSubmitNew: (fields: FeatureLaneConvertNewFields) => Promise<boolean>;
}

export function QuickAddMenuConvert({
  addLabel,
  boardId,
  contentAlign = 'start',
  excludedIssueKeys = EMPTY_EXCLUDED_KEYS,
  hintNew,
  isSubmitting,
  modeLabelKeys,
  modes,
  onAddDraft,
  onSelectExisting,
  onSubmitNew,
  parentCandidates = false,
  queueOptions,
  submitLabel,
  trigger,
}: QuickAddMenuConvertProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ConvertStep>('picker');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const issueSearch = useQuickAddIssueSearch({
    boardId,
    excludedIssueKeys,
    mode: step === 'existing' ? 'existing' : 'new',
    parentCandidates,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setStep('picker');
    }
    setOpen(nextOpen);
  };

  const handleSelectMode = (mode: QuickAddMode) => {
    if (mode === 'draft') {
      onAddDraft?.();
      handleOpenChange(false);
      return;
    }
    if (mode === 'existing' || mode === 'new') {
      setStep(mode);
    }
  };

  const handleSelectExisting = async (task: Task) => {
    const attached = await onSelectExisting(task);
    if (attached) {
      handleOpenChange(false);
    }
  };

  const handleSubmitNew = async (fields: FeatureLaneConvertNewFields) => {
    const created = await onSubmitNew(fields);
    if (created) {
      handleOpenChange(false);
    }
  };

  useLayoutEffect(() => {
    if (step === 'existing') {
      searchInputRef.current?.focus();
    }
  }, [step]);

  if (modes.length === 0) {
    return null;
  }

  const panelWidth = step === 'picker' ? QUICK_ADD_KIND_PICKER_WIDTH_PX : QUICK_ADD_MENU_MIN_WIDTH_PX;

  return (
    <Popover.Root modal={false} open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={contentAlign}
          avoidCollisions
          className={`${FLOATING_MENU_SHELL} overflow-hidden font-sans outline-none ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={8}
          side="top"
          sideOffset={6}
          style={{
            minWidth: panelWidth,
            width: panelWidth,
            zIndex: ZIndex.popupContent,
          }}
          onInteractOutside={(event) => {
            if (isNestedRadixFloatingTarget(event.target)) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => preventConvertFormAutoFocus(event, step)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {step === 'picker' ? (
            <QuickAddMenuKindPicker
              disabled={isSubmitting}
              items={toPickerItems(modes)}
              modeLabelKeys={modeLabelKeys}
              title={addLabel}
              onClose={() => handleOpenChange(false)}
              onSelect={handleSelectMode}
            />
          ) : (
            <>
              <QuickAddMenuHeader
                disabled={isSubmitting}
                mode={step}
                onBack={() => setStep('picker')}
                onClose={() => handleOpenChange(false)}
              />
              {step === 'existing' ? (
                <QuickAddMenuExistingPanel
                  isSearching={issueSearch.isSearching}
                  isSubmitting={isSubmitting}
                  searchInputRef={searchInputRef}
                  searchQuery={issueSearch.searchQuery}
                  showResultsPanel={issueSearch.showResultsPanel}
                  visibleResults={issueSearch.visibleResults}
                  onSearchQueryChange={issueSearch.handleSearchQueryChange}
                  onSelectExisting={(task) => {
                    void handleSelectExisting(task);
                  }}
                />
              ) : (
                <FeatureLaneConvertNewPanel
                  boardId={boardId > 0 ? boardId : null}
                  hint={hintNew}
                  isSubmitting={isSubmitting}
                  queueOptions={queueOptions}
                  submitLabel={submitLabel}
                  title=""
                  onSubmit={(fields) => {
                    void handleSubmitNew(fields);
                  }}
                />
              )}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
