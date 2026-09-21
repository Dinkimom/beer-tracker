'use client';

import type { Developer } from '@/types';

import { useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { DevelopersManagementContent } from '@/features/sidebar/components/DevelopersManagement';
import { FeatureLaneRowTitle } from '@/features/swimlane/components/FeatureLaneRowTitle';
import { isFeatureLaneDraftRowId } from '@/features/swimlane/utils/featureSwimlaneRows';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

interface FeatureRowsSettingsPopupProps {
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
  position: { left: number; top: number };
  onAddRow: (name: string) => void;
  onClose: () => void;
  onRemoveDraft: (rowId: string) => void;
}

export function FeatureRowsSettingsPopup({
  developersManagement,
  isOpen,
  onAddRow,
  onClose,
  onRemoveDraft,
  position,
}: FeatureRowsSettingsPopupProps) {
  const { t } = useI18n();
  const featureColumn = useFeatureLaneColumnUi();
  const { rowTitleById } = featureColumn;
  const [draftName, setDraftName] = useState('');
  const overlay = useOverlayPresence(isOpen);

  if (!overlay.mounted || typeof document === 'undefined') {
    return null;
  }

  const handleClose = () => {
    setDraftName('');
    onClose();
  };

  const submitDraft = () => {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    onAddRow(name);
    setDraftName('');
  };

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/10 dark:bg-black/20 ${OVERLAY_BACKDROP_ENTER}`}
        data-state={overlay.state}
        style={{ zIndex: ZIndex.contextMenu }}
        onAnimationEnd={overlay.onAnimationEnd}
        onClick={handleClose}
      />
      <div
        className={`fixed flex max-h-[70vh] w-[380px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        style={{
          zIndex: ZIndex.popupContent,
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('sprintPlanner.featureLanes.editorAddTitle')}
            </h3>
            <HeaderIconButton
              aria-label={t('sprintPlanner.featureLanes.close')}
              className="!h-6 !w-6"
              title={t('sprintPlanner.featureLanes.close')}
              type="button"
              onClick={handleClose}
            >
              <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" name="x" />
            </HeaderIconButton>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('sprintPlanner.featureLanes.addLocalOnlyHint')}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Input
              className="!px-3 !py-1.5 text-sm"
              placeholder={t('sprintPlanner.featureLanes.addRowPlaceholder')}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitDraft();
                }
              }}
            />
            <Button
              className="shrink-0"
              disabled={!draftName.trim()}
              type="button"
              variant="primary"
              onClick={submitDraft}
            >
              {t('sprintPlanner.featureLanes.addRowSubmit')}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('sprintPlanner.featureLanes.editorTitle')}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                type="button"
                onClick={developersManagement.showAllDevelopers}
              >
                {t('sprintPlanner.featureLanes.showAll')}
              </button>
              <button
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                type="button"
                onClick={developersManagement.hideAllDevelopers}
              >
                {t('sprintPlanner.featureLanes.hideAll')}
              </button>
            </div>
          </div>
          {developersManagement.sortedDevelopers.length > 0 ? (
            <DevelopersManagementContent
              canRemoveDeveloper={(developer) => isFeatureLaneDraftRowId(developer.id)}
              developers={developersManagement.sortedDevelopers}
              developersManagement={developersManagement}
              hideAvatar
              renderItemName={(developer) => {
                const parts = rowTitleById.get(developer.id);
                return (
                  <FeatureLaneRowTitle
                    issueKey={parts?.key ?? null}
                    issueType={parts?.issueType}
                    title={parts?.title ?? developer.name}
                    variant="list"
                  />
                );
              }}
              onRemoveDeveloper={(developer) => {
                onRemoveDraft(developer.id);
              }}
            />
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('sprintPlanner.featureLanes.empty')}
            </p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
