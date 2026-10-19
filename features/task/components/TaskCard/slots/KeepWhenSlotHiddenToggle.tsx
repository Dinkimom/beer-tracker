'use client';

interface KeepWhenSlotHiddenToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  t: (key: string, params?: Record<string, number | string>) => string;
}

export function KeepWhenSlotHiddenToggle({ checked, onChange, t }: KeepWhenSlotHiddenToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-0.5 py-1 transition-colors hover:bg-gray-100/80 active:bg-gray-200/70 dark:hover:bg-gray-800/80 dark:active:bg-gray-700/70">
      <input
        checked={checked}
        className="mt-0.5 h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500/40 dark:border-gray-600 dark:bg-gray-800"
        type="checkbox"
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-gray-800 dark:text-gray-100">
          {t('settings.planningTab.cardSlots.keepWhenSlotHidden')}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-ds-text-muted">
          {t('settings.planningTab.cardSlots.keepWhenSlotHiddenHint')}
        </span>
      </span>
    </label>
  );
}
