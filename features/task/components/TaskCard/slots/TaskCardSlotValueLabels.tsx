'use client';

import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

const INPUT_CLASS =
  'w-28 shrink-0 cursor-text self-start rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';
const SEARCH_AFTER = 8;

interface TaskCardSlotValueLabelsProps {
  fieldId: string;
  fieldLabel: string;
  labels: Readonly<Record<string, string>> | undefined;
  options: readonly string[];
  presentation: 'tag' | 'text';
  status: 'idle' | 'loading' | 'ready';
  onChange: (option: string, label: string) => void;
}

export function TaskCardSlotValueLabels({
  fieldId,
  fieldLabel,
  labels,
  onChange,
  options,
  presentation,
  status,
}: TaskCardSlotValueLabelsProps) {
  const { t } = useI18n();
  const [storedQuery, setStoredQuery] = useState({ fieldId, query: '' });
  if (storedQuery.fieldId !== fieldId) {
    setStoredQuery({ fieldId, query: '' });
  }
  const query = storedQuery.fieldId === fieldId ? storedQuery.query : '';
  if (status === 'idle' || (status === 'ready' && options.length === 0)) {
    return null;
  }
  const needle = query.trim().toLowerCase();
  const visible = needle ? options.filter((option) => option.toLowerCase().includes(needle)) : options;
  return (
    <section className="max-w-xs space-y-2">
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {t('settings.planningTab.cardSlots.valueLabelsHeading')}
      </h4>
      {status === 'loading' ? <p className="text-xs text-ds-text-muted">{t('common.loading')}</p> : null}
      {status === 'ready' && options.length > SEARCH_AFTER ? (
        <input
          aria-label={t('settings.planningTab.cardSlots.valueLabelSearch')}
          className="w-full cursor-text rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          placeholder={t('settings.planningTab.cardSlots.valueLabelSearch')}
          type="search"
          value={query}
          onChange={(event) => {
            setStoredQuery({ fieldId, query: event.target.value });
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        />
      ) : null}
      {status === 'ready' && visible.length === 0 ? (
        <p className="text-xs text-ds-text-muted">{t('settings.planningTab.cardSlots.valueLabelSearchEmpty')}</p>
      ) : null}
      {status === 'ready' ? (
        <ul className="space-y-2.5">
          {visible.map((option) => {
            const short = labels?.[option] ?? '';
            const filled = Boolean(short.trim());
            const shown = filled ? short.trim() : option;
            return (
              <li key={option} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span
                    className="min-w-0 flex-1 break-words text-xs leading-snug text-gray-800 dark:text-gray-100"
                    title={option}
                  >
                    {option}
                  </span>
                  <input
                    aria-label={t('settings.planningTab.cardSlots.valueLabelFor', { value: option })}
                    className={INPUT_CLASS}
                    placeholder={option}
                    title={option}
                    value={short}
                    onBlur={() => {
                      const next = short.trim().slice(0, 80);
                      if (next !== short) {
                        onChange(option, next);
                      }
                    }}
                    onChange={(event) => {
                      onChange(option, event.target.value.slice(0, 80));
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                  />
                </div>
                <span className={resultClass(presentation, filled)} title={fieldCaption(fieldLabel, option)}>
                  {fieldCaption(fieldLabel, shown)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function fieldCaption(label: string, value: string): string {
  const name = label.trim();
  if (!name) {
    return value;
  }
  return `${name}: ${value}`;
}

function resultClass(presentation: 'tag' | 'text', filled: boolean): string {
  if (presentation === 'text') {
    return filled
      ? 'block min-w-0 truncate text-[10px] font-medium leading-none text-gray-700 dark:text-gray-200'
      : 'block min-w-0 truncate text-[10px] font-medium leading-none text-gray-400 dark:text-gray-500';
  }
  const tone = filled
    ? 'border-gray-300 text-gray-700 dark:border-gray-500 dark:text-gray-200'
    : 'border-dashed border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500';
  return `inline-flex max-w-full truncate rounded border px-1 py-0.5 text-[10px] font-medium leading-none ${tone}`;
}
