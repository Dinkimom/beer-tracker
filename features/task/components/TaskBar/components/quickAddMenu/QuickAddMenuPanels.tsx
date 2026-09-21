'use client';

import type { QuickAddIssueSearchResult, SwimlaneQuickAddMenuProps } from './types';
import type { CustomSelectOption } from '@/components/CustomSelect';
import type { RefObject } from 'react';

import { QuickAddMenuExistingPanel } from './QuickAddMenuExistingPanel';
import { QuickAddMenuNewPanel } from './QuickAddMenuNewPanel';

interface QuickAddMenuPanelsProps {
  assigneeId?: string;
  canCreateTask: boolean;
  draftTitle: string;
  effectiveIssueType: string;
  effectiveParentKey: string;
  effectiveQueueKey: string;
  isSubmitting: boolean;
  issueSearch: {
    handleSearchQueryChange: (query: string) => void;
    isSearching: boolean;
    searchQuery: string;
    showResultsPanel: boolean;
    visibleResults: QuickAddIssueSearchResult[];
  };
  issueTypeOptions: CustomSelectOption<string>[];
  menuZIndex: number;
  mode: 'existing' | 'new';
  newTaskInputRef: RefObject<HTMLTextAreaElement | null>;
  onSelectExisting: SwimlaneQuickAddMenuProps['onSelectExisting'];
  parentSelect: {
    handleParentSearchQueryChange: (query: string) => void;
    isParentSearching: boolean;
    parentSelectOptions: CustomSelectOption<string>[];
  };
  queueNamesByKey: Map<string, string>;
  queueSelect: {
    handleQueueSearchQueryChange: (query: string) => void;
    isQueueSearching: boolean;
    queueSelectOptions: CustomSelectOption<string>[];
    selectedQueueName: string;
  };
  searchInputRef: RefObject<HTMLInputElement | null>;
  showAssigneeSelect?: boolean;
  onAssigneeChange?: (assigneeId: string) => void;
  onCreateTask: () => void;
  onIssueTypeChange: (type: string) => void;
  onParentChange: (parentKey: string) => void;
  onQueueChange: (queueKey: string) => void;
  onTitleChange: (value: string) => void;
}

export function QuickAddMenuPanels({
  assigneeId,
  canCreateTask,
  draftTitle,
  effectiveIssueType,
  effectiveParentKey,
  effectiveQueueKey,
  isSubmitting,
  issueSearch,
  issueTypeOptions,
  menuZIndex,
  mode,
  newTaskInputRef,
  onAssigneeChange,
  onCreateTask,
  onIssueTypeChange,
  onParentChange,
  onQueueChange,
  onSelectExisting,
  onTitleChange,
  parentSelect,
  queueNamesByKey,
  queueSelect,
  searchInputRef,
  showAssigneeSelect = false,
}: QuickAddMenuPanelsProps) {
  if (mode === 'existing') {
    return (
      <QuickAddMenuExistingPanel
        isSearching={issueSearch.isSearching}
        isSubmitting={isSubmitting}
        searchInputRef={searchInputRef}
        searchQuery={issueSearch.searchQuery}
        showResultsPanel={issueSearch.showResultsPanel}
        visibleResults={issueSearch.visibleResults}
        onSearchQueryChange={issueSearch.handleSearchQueryChange}
        onSelectExisting={onSelectExisting}
      />
    );
  }
  return (
    <QuickAddMenuNewPanel
      assigneeId={assigneeId}
      canCreate={canCreateTask}
      isParentSearching={parentSelect.isParentSearching}
      isQueueSearching={queueSelect.isQueueSearching}
      isSubmitting={isSubmitting}
      issueType={effectiveIssueType}
      issueTypeOptions={issueTypeOptions}
      menuZIndex={menuZIndex}
      parentKey={effectiveParentKey}
      parentSelectOptions={parentSelect.parentSelectOptions}
      queueKey={effectiveQueueKey}
      queueNamesByKey={queueNamesByKey}
      queueSelectOptions={queueSelect.queueSelectOptions}
      selectedQueueName={queueSelect.selectedQueueName}
      showAssigneeSelect={showAssigneeSelect}
      textareaRef={newTaskInputRef}
      title={draftTitle}
      onAssigneeChange={onAssigneeChange}
      onCreate={onCreateTask}
      onIssueTypeChange={onIssueTypeChange}
      onParentChange={onParentChange}
      onParentSearchQueryChange={parentSelect.handleParentSearchQueryChange}
      onQueueChange={onQueueChange}
      onQueueSearchQueryChange={queueSelect.handleQueueSearchQueryChange}
      onTitleChange={onTitleChange}
    />
  );
}
