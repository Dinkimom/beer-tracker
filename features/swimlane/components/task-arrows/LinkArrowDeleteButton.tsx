'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { LINK_ARROW_DELETE_BUTTON_SIZE_PX, isEventTargetInsideTask } from '@/features/swimlane/utils/task-arrows/linkArrowDeleteHandleHelpers';

interface LinkArrowDeleteButtonProps {
  fromTaskId: string;
  style: { left: number; top: number };
  onDelete: () => void;
  onHoverChange: (hovered: boolean) => void;
  onSourceHoverEnd: () => void;
}

export function LinkArrowDeleteButton({
  fromTaskId,
  onDelete,
  onHoverChange,
  onSourceHoverEnd,
  style,
}: LinkArrowDeleteButtonProps) {
  const { t } = useI18n();
  const label = t('sprintPlanner.links.deleteAria');

  return (
    <Button
      aria-label={label}
      className="pointer-events-auto absolute !h-5 !w-5 !min-h-0 !min-w-0 !justify-center !rounded-sm !p-0 text-red-600 transition-colors duration-200 focus-visible:outline-none dark:text-red-400 !border-gray-200 !bg-white !shadow-sm hover:!border-red-300 hover:!bg-red-50 hover:!shadow-md dark:!border-gray-600 dark:!bg-gray-800 dark:hover:!border-red-800 dark:hover:!bg-red-950"
      data-link-delete-handle
      style={{
        left: style.left,
        position: 'absolute',
        top: style.top,
        width: LINK_ARROW_DELETE_BUTTON_SIZE_PX,
        height: LINK_ARROW_DELETE_BUTTON_SIZE_PX,
      }}
      title={label}
      type="button"
      variant="outline"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={(e) => {
        onHoverChange(false);
        if (!isEventTargetInsideTask(e.relatedTarget, fromTaskId)) {
          onSourceHoverEnd();
        }
      }}
    >
      <Icon className="h-3 w-3" name="x" />
    </Button>
  );
}
