import type { QuickAddMode } from '../types';

import { useCallback, useState } from 'react';

interface UseQuickAddLockedDraftFieldsParams {
  issueType: string;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
  parentKey: string;
  queueKey: string;
  onIssueTypeChange: (type: string) => void;
  onParentChange: (parentKey: string) => void;
  onQueueChange: (queueKey: string) => void;
}

export function useQuickAddLockedDraftFields({
  issueType,
  lockedMode,
  onIssueTypeChange,
  onParentChange,
  onQueueChange,
  parentKey,
  queueKey,
}: UseQuickAddLockedDraftFieldsParams) {
  const [draftIssueType, setDraftIssueType] = useState(issueType);
  const [draftParentKey, setDraftParentKey] = useState(parentKey);
  const [draftQueueKey, setDraftQueueKey] = useState(queueKey);

  const handleIssueTypeChange = useCallback(
    (type: string) => {
      if (lockedMode) {
        setDraftIssueType(type);
      }
      onIssueTypeChange(type);
    },
    [lockedMode, onIssueTypeChange]
  );

  const handleQueueChange = useCallback(
    (nextQueueKey: string) => {
      if (lockedMode) {
        setDraftQueueKey(nextQueueKey);
      }
      onQueueChange(nextQueueKey);
    },
    [lockedMode, onQueueChange]
  );

  const handleParentChange = useCallback(
    (nextParentKey: string) => {
      if (lockedMode) {
        setDraftParentKey(nextParentKey);
      }
      onParentChange(nextParentKey);
    },
    [lockedMode, onParentChange]
  );

  return {
    createFields: lockedMode
      ? {
          issueType: draftIssueType,
          parentKey: draftParentKey,
          queueKey: draftQueueKey,
        }
      : undefined,
    effectiveIssueType: lockedMode ? draftIssueType : issueType,
    effectiveParentKey: lockedMode ? draftParentKey : parentKey,
    effectiveQueueKey: lockedMode ? draftQueueKey : queueKey,
    handleIssueTypeChange,
    handleParentChange,
    handleQueueChange,
  };
}
