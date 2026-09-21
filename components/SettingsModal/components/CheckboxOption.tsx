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
    <label className="flex items-center gap-2 cursor-pointer py-1">
      <input
        checked={checked}
        className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer accent-blue-600"
        type="checkbox"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}
