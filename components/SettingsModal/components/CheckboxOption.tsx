'use client';

interface CheckboxOptionProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function CheckboxOption({
  checked,
  label,
  onChange,
}: CheckboxOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5">
      <input
        checked={checked}
        className="h-3.5 w-3.5 cursor-pointer rounded border border-gray-300 bg-white text-blue-500 accent-blue-500 focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 dark:border-gray-500 dark:bg-gray-700 dark:accent-blue-400"
        type="checkbox"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}
