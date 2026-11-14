'use client';

import { useState } from 'react';

interface QuarterlyPlanInlineInputProps {
  initialValue?: string;
  placeholder: string;
  /** Название или null, если ввод отменён либо поле пустое. */
  onSubmit: (title: string | null) => void;
}

/** Поле в строке плана: Enter и уход фокуса сохраняют, Escape отменяет. */
export function QuarterlyPlanInlineInput({
  initialValue = '',
  placeholder,
  onSubmit,
}: QuarterlyPlanInlineInputProps) {
  const [value, setValue] = useState(initialValue);
  const [closed, setClosed] = useState(false);

  const finish = (title: string | null) => {
    if (closed) return;
    setClosed(true);
    onSubmit(title?.trim() || null);
  };

  return (
    <input
      autoFocus
      className="min-w-0 flex-1 rounded-md bg-blue-500/[0.08] px-1.5 py-0.5 text-sm text-gray-900 outline-none ring-1 ring-blue-500/50 dark:text-gray-100"
      placeholder={placeholder}
      value={value}
      onBlur={() => finish(value)}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') finish(value);
        if (event.key === 'Escape') finish(null);
      }}
    />
  );
}
