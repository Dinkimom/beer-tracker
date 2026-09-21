import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
} from '@/features/context-menu/contextMenuClasses';

interface QuickAddMenuCloseButtonProps {
  className?: string;
  disabled?: boolean;
  onClose: () => void;
}

export function QuickAddMenuCloseButton({
  className = '',
  disabled = false,
  onClose,
}: QuickAddMenuCloseButtonProps) {
  const { t } = useI18n();
  const label = t('sprintPlanner.swimlane.quickAddMenu.close');

  return (
    <Button
      aria-label={label}
      className={`!h-7 !w-7 !min-h-0 !min-w-0 !justify-center !rounded-md !p-0 text-gray-500 dark:text-gray-400 ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${className}`}
      disabled={disabled}
      title={label}
      type="button"
      variant="ghost"
      onClick={onClose}
    >
      <Icon className="h-4 w-4" name="x" />
    </Button>
  );
}
