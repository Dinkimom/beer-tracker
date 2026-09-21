'use client';

import { ZIndex } from '@/constants';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

import { FeatureLaneAddMenu } from './FeatureLaneAddMenu';

interface FeatureLaneAddRowProps {
  participantsColumnWidth: number;
}

export function FeatureLaneAddRow({ participantsColumnWidth }: FeatureLaneAddRowProps) {
  const { onAddFeatureRow } = useFeatureLaneColumnUi();
  if (!onAddFeatureRow) {
    return null;
  }

  return (
    <div className="flex min-w-0 border-b border-gray-200 dark:border-gray-700">
      <div
        className="sticky left-0 shrink-0 border-r border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
        style={{
          width: participantsColumnWidth,
          minWidth: participantsColumnWidth,
          zIndex: ZIndex.stickyLeftColumn,
        }}
      >
        <FeatureLaneAddMenu />
      </div>
      <div className="min-w-0 flex-1 bg-white dark:bg-gray-800" />
    </div>
  );
}
