import type { CustomSelectOption } from '@/components/CustomSelect';

/** className задаёт ширину (`w-*`), а не min/max-width — тогда базовый `w-full` не нужен. */
export function customSelectClassHasExplicitWidth(className: string | undefined): boolean {
  if (!className) return false;
  return /(?:^|[\s:])!?w-(?:full|auto|screen|svw|lvw|dvw|min|max|fit|px|\d|\[)/.test(className);
}

export function customSelectTriggerClassName(
  isIconTrigger: boolean,
  size: 'compact' | 'default',
  className?: string
): string {
  if (isIconTrigger) {
    return `!items-center font-medium !h-8 !w-8 !min-w-8 !justify-center !gap-0 !rounded-md !border-0 !bg-gray-100 !px-0 !py-0 shadow-none hover:!bg-gray-300 dark:!bg-gray-800 dark:hover:!bg-gray-700 ${className ?? ''}`;
  }
  const sizeClass = size === 'compact' ? '!h-8 text-sm' : '!h-9 text-sm';
  // Не форсируем w-full при явной ширине — иначе Tailwind-конфликт (w-full vs w-[200px])
  // ломает flex-toolbar (фильтры эпика уезжают каждый на свою строку).
  const widthClass = customSelectClassHasExplicitWidth(className) ? '' : 'w-full';
  return `!items-center font-medium ${widthClass} !justify-between !gap-2 !px-3 !py-0 ${sizeClass} ${className ?? ''}`;
}

export function customSelectChevronClassName(
  size: 'compact' | 'default',
  isOpen: boolean
): string {
  const iconSize = size === 'compact' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  const rotation = isOpen ? 'rotate-180' : '';
  return `${iconSize} shrink-0 transition-transform duration-200 ${rotation}`;
}

export function customSelectDisplayText<T extends string>(
  selectedOption: CustomSelectOption<T> | undefined,
  value: T,
  selectedPrefix?: string
): string {
  if (!selectedOption) {
    return String(value);
  }
  return selectedPrefix ? `${selectedPrefix}${selectedOption.label}` : selectedOption.label;
}

export function customSelectOptionRowClass(isOptionDisabled: boolean, isSelected: boolean): string {
  if (isOptionDisabled) {
    return 'cursor-not-allowed !text-gray-400 !opacity-60 dark:!text-gray-500';
  }
  if (isSelected) {
    return 'cursor-pointer !bg-blue-50 !text-blue-700 hover:!bg-blue-50 dark:!bg-blue-900/30 dark:!text-blue-300 dark:hover:!bg-blue-900/30';
  }
  return 'cursor-pointer text-gray-700 hover:!bg-gray-50 dark:text-gray-300 dark:hover:!bg-gray-700';
}

export function customSelectPopoverStyle(
  menuFitContent: boolean,
  contentZIndex: number,
  popoverWidth: number | undefined,
  popoverMinWidth: number | undefined
): {
  maxWidth?: string;
  minWidth?: number;
  width?: number | 'max-content';
  zIndex: number;
} {
  if (menuFitContent) {
    return {
      zIndex: contentZIndex,
      width: 'max-content',
      minWidth: popoverMinWidth,
      maxWidth: 'min(100vw - 16px, 20rem)',
    };
  }
  return {
    zIndex: contentZIndex,
    width: popoverWidth,
    minWidth: popoverWidth,
  };
}

export function resolvePopoverWidth(
  triggerWidth: number,
  menuFitContent: boolean,
  menuMinWidth: number | undefined
): number | undefined {
  if (menuFitContent) {
    return undefined;
  }
  const desiredWidth = menuMinWidth ? Math.max(triggerWidth, menuMinWidth) : triggerWidth;
  const maxWidth = Math.max(160, window.innerWidth - 16);
  return Math.min(desiredWidth, maxWidth);
}
