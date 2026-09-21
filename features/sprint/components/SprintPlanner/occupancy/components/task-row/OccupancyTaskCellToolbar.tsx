import type { MouseEvent } from 'react';

import { Button } from '@/components/Button';
import { CopyFeedbackGlyph } from '@/components/CopyFeedbackGlyph';
import { Icon } from '@/components/Icon';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';

const ROW_ACTION_BTN_CLASS =
  'opacity-0 transition-opacity duration-150 group-hover:opacity-100 !h-6 !w-6 !min-h-0 !min-w-0 shrink-0 !justify-center !rounded-md !border-gray-200 !bg-white !p-0 text-gray-400 shadow-none hover:!bg-white hover:!text-gray-700 hover:!border-gray-300 dark:!border-gray-600 dark:!bg-gray-800 dark:text-gray-400 dark:hover:!bg-gray-800 dark:hover:!text-gray-100 dark:hover:!border-gray-500 focus-visible:outline-none';

interface OccupancyTaskCellToolbarProps {
  displayKey: string;
  issueUrl: string;
  onOpenMenu: (e: MouseEvent) => void;
}

export function OccupancyTaskCellToolbar({
  displayKey,
  issueUrl,
  onOpenMenu,
}: OccupancyTaskCellToolbarProps) {
  const keyCopyFeedback = useCopyFeedback();
  const linkCopyFeedback = useCopyFeedback();

  return (
    <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5">
      <Button
        className={ROW_ACTION_BTN_CLASS}
        title="Скопировать ключ задачи"
        type="button"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          keyCopyFeedback.copy(displayKey).catch(() => undefined);
        }}
      >
        <CopyFeedbackGlyph className="h-3.5 w-3.5" copied={keyCopyFeedback.copied} idleName="copy" />
      </Button>
      <Button
        className={ROW_ACTION_BTN_CLASS}
        title="Скопировать ссылку на задачу"
        type="button"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          linkCopyFeedback.copy(issueUrl).catch(() => undefined);
        }}
      >
        <CopyFeedbackGlyph className="h-3.5 w-3.5" copied={linkCopyFeedback.copied} idleName="link" />
      </Button>
      <Button
        className={ROW_ACTION_BTN_CLASS}
        data-occupancy-row-context-menu-trigger="true"
        title="Действия с задачей"
        type="button"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onOpenMenu(e);
        }}
      >
        <Icon className="h-3.5 w-3.5" name="dots-horizontal" />
      </Button>
    </div>
  );
}
