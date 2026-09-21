'use client';

import type { QuickAddMode } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { FeatureLaneConvertNewFields } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';
import type { Task } from '@/types';

import * as Popover from '@radix-ui/react-popover';
import { useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { FeatureLaneConvertNewPanel } from '@/features/sprint/components/SprintPlanner/feature-lanes/FeatureLaneConvertNewPanel';
import {
  isFeatureLaneActionableRowId,
  isFeatureLaneDraftRowId,
} from '@/features/swimlane/utils/featureSwimlaneRows';
import { useQuickAddIssueSearch } from '@/features/task/components/TaskBar/components/quickAddMenu/hooks/useQuickAddIssueSearch';
import { QuickAddMenuExistingPanel } from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuExistingPanel';
import { QuickAddMenuHeader } from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuHeader';
import { buildQuickAddRootPickerItems } from '@/features/task/components/TaskBar/components/quickAddMenu/quickAddMenuModes';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';
import { QUICK_ADD_KIND_PICKER_WIDTH_PX, QUICK_ADD_MENU_MIN_WIDTH_PX } from '@/hooks/useFollowAnchorRect';

import { FeatureLaneDraftRowPicker } from './FeatureLaneDraftRowPicker';
import {
  FeatureLaneRowSprintPicker,
  filterFeatureLaneMoveSprints,
} from './FeatureLaneRowSprintPicker';

const EMPTY_EXCLUDED_KEYS = new Set<string>();
const CONVERT_PICKER_ITEMS = buildQuickAddRootPickerItems(['new', 'existing']);
const CONVERT_NEW_ONLY_ITEMS = buildQuickAddRootPickerItems(['new']);

type DraftRowMenuStep = 'existing' | 'move' | 'new' | 'picker';

function resolveFeatureLaneRowMenuFlags(input: {
  canConvert: boolean;
  canMove: boolean;
  canRemove: boolean;
  hasMoveTargets: boolean;
  isDraftRow: boolean;
}): { showConvert: boolean; showDelete: boolean; showMove: boolean } {
  return {
    showConvert: input.isDraftRow && input.canConvert,
    showDelete: input.canRemove,
    showMove: input.canMove && input.hasMoveTargets,
  };
}

function featureLaneRowMenuWidthPx(step: DraftRowMenuStep): number {
  if (step === 'picker' || step === 'move') {
    return QUICK_ADD_KIND_PICKER_WIDTH_PX;
  }
  return QUICK_ADD_MENU_MIN_WIDTH_PX;
}

function preventDraftRowFormAutoFocus(event: Event, step: DraftRowMenuStep): void {
  if (step !== 'picker') {
    event.preventDefault();
  }
}

function isNestedRadixFloatingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-radix-popper-content-wrapper]'));
}

interface FeatureLaneDraftRowActionsProps {
  rowId: string;
}

export function FeatureLaneDraftRowActions({ rowId }: FeatureLaneDraftRowActionsProps) {
  const { t } = useI18n();
  const {
    convertBoardId,
    convertIsSubmitting,
    convertQueueOptions,
    moveFeatureRow,
    onConvertFeatureRow,
    onConvertFeatureRowExisting,
    removeFeatureRow,
    rowTitleById,
    selectedSprintId,
    sprints,
  } = useFeatureLaneColumnUi();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DraftRowMenuStep>('picker');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const boardId = convertBoardId ?? 0;
  const isDraftRow = isFeatureLaneDraftRowId(rowId);
  const { showConvert, showDelete, showMove } = resolveFeatureLaneRowMenuFlags({
    canConvert: Boolean(onConvertFeatureRow),
    canMove: Boolean(moveFeatureRow),
    canRemove: Boolean(removeFeatureRow),
    hasMoveTargets: filterFeatureLaneMoveSprints(sprints, selectedSprintId).length > 0,
    isDraftRow,
  });
  const issueSearch = useQuickAddIssueSearch({
    boardId,
    excludedIssueKeys: EMPTY_EXCLUDED_KEYS,
    mode: step === 'existing' ? 'existing' : 'new',
    parentCandidates: true,
  });
  const moreLabel = t('sprintPlanner.featureLanes.rowMoreActions');

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep('picker');
    }
  };

  const handleSelectMode = (mode: QuickAddMode) => {
    if (mode === 'new' || mode === 'existing') {
      setStep(mode);
    }
  };

  const handleSelectExisting = async (task: Task) => {
    const attached = await onConvertFeatureRowExisting?.(rowId, task);
    if (attached) {
      handleOpenChange(false);
    }
  };

  const handleSubmitNew = async (fields: FeatureLaneConvertNewFields) => {
    const created = await onConvertFeatureRow?.(rowId, fields);
    if (created) {
      handleOpenChange(false);
    }
  };

  const handleDelete = () => {
    handleOpenChange(false);
    removeFeatureRow?.(rowId);
  };

  const handleMoveSprint = (sprintId: number) => {
    handleOpenChange(false);
    if (!moveFeatureRow) {
      return;
    }
    moveFeatureRow(rowId, sprintId).catch((error: unknown) => {
      console.error('Failed to move feature row', error);
    });
  };

  const pickerItems = boardId > 0 ? CONVERT_PICKER_ITEMS : CONVERT_NEW_ONLY_ITEMS;
  const draftTitle =
    rowTitleById.get(rowId)?.title ?? t('sprintPlanner.featureLanes.newFeatureName');

  useLayoutEffect(() => {
    if (step === 'existing') {
      searchInputRef.current?.focus();
    }
  }, [step]);

  if (!isFeatureLaneActionableRowId(rowId) || (!showConvert && !showMove && !showDelete)) {
    return null;
  }

  const panelWidth = featureLaneRowMenuWidthPx(step);

  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center leading-none opacity-0 transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100 has-[[data-state=open]]:opacity-100">
      <Popover.Root modal={false} open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <Button
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={moreLabel}
            className="!inline-flex !h-6 !w-6 !min-h-0 !min-w-0 !leading-none !p-0 items-center justify-center text-gray-400 hover:!bg-gray-100 hover:!text-gray-700 dark:hover:!bg-gray-800 dark:hover:!text-gray-200"
            title={moreLabel}
            type="button"
            variant="ghost"
            onClick={(event) => event.stopPropagation()}
          >
            <Icon className="block h-4 w-4" name="dots-horizontal" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            avoidCollisions
            className={`${FLOATING_MENU_SHELL} overflow-hidden font-sans outline-none ${OVERLAY_FLOATING_ANIMATION}`}
            collisionPadding={8}
            side="bottom"
            sideOffset={6}
            style={{
              minWidth: panelWidth,
              width: panelWidth,
              zIndex: ZIndex.popupContent,
            }}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (isNestedRadixFloatingTarget(event.target)) {
                event.preventDefault();
              }
            }}
            onOpenAutoFocus={(event) => preventDraftRowFormAutoFocus(event, step)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {step === 'picker' ? (
              <FeatureLaneDraftRowPicker
                convertItems={pickerItems}
                disabled={convertIsSubmitting}
                removeLabel={
                  isDraftRow
                    ? t('sprintPlanner.featureLanes.deleteRowTitle')
                    : t('sprintPlanner.featureLanes.removeFromSprintTitle')
                }
                showConvert={showConvert}
                showDelete={showDelete}
                showMove={showMove}
                onClose={() => handleOpenChange(false)}
                onDelete={handleDelete}
                onSelectConvert={handleSelectMode}
                onSelectMove={() => setStep('move')}
              />
            ) : null}
            {step === 'move' ? (
              <FeatureLaneRowSprintPicker
                currentSprintId={selectedSprintId}
                disabled={convertIsSubmitting}
                sprints={sprints}
                onBack={() => setStep('picker')}
                onClose={() => handleOpenChange(false)}
                onSelect={handleMoveSprint}
              />
            ) : null}
            {step === 'existing' || step === 'new' ? (
              <>
                <QuickAddMenuHeader
                  disabled={convertIsSubmitting}
                  mode={step}
                  title={t(
                    step === 'new'
                      ? 'sprintPlanner.featureLanes.convertModeNew'
                      : 'sprintPlanner.featureLanes.convertModeExisting'
                  )}
                  onBack={() => setStep('picker')}
                  onClose={() => handleOpenChange(false)}
                />
                {step === 'existing' ? (
                  <QuickAddMenuExistingPanel
                    isSearching={issueSearch.isSearching}
                    isSubmitting={convertIsSubmitting}
                    searchInputRef={searchInputRef}
                    searchQuery={issueSearch.searchQuery}
                    showResultsPanel={issueSearch.showResultsPanel}
                    visibleResults={issueSearch.visibleResults}
                    onSearchQueryChange={issueSearch.handleSearchQueryChange}
                    onSelectExisting={handleSelectExisting}
                  />
                ) : (
                  <FeatureLaneConvertNewPanel
                    boardId={convertBoardId}
                    isSubmitting={convertIsSubmitting}
                    queueOptions={convertQueueOptions}
                    title={draftTitle}
                    onSubmit={(fields) => {
                      handleSubmitNew(fields).catch((error: unknown) => {
                        console.error('Failed to convert feature row', error);
                      });
                    }}
                  />
                )}
              </>
            ) : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
