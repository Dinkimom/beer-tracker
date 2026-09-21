'use client';

import type { Quarter } from '@/types';

import { useCallback } from 'react';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface QuarterSelectorProps {
  quarter: Quarter;
  year: number;
  onQuarterChange: (year: number, quarter: Quarter) => void;
}

export function QuarterSelector({ year, quarter, onQuarterChange }: QuarterSelectorProps) {
  const { t } = useI18n();
  const handleQuarterClick = useCallback((q: Quarter) => {
    onQuarterChange(year, q);
  }, [year, onQuarterChange]);

  const handleYearChange = useCallback((newYear: number) => {
    onQuarterChange(newYear, quarter);
  }, [quarter, onQuarterChange]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <HeaderIconButton
          aria-label={t('planning.quarterly.prevYearAria')}
          title={t('planning.quarterly.prevYearTitle')}
          type="button"
          onClick={() => handleYearChange(year - 1)}
        >
          <Icon name="chevron-left" size="sm" />
        </HeaderIconButton>

        <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700">
          <span className="text-gray-900 dark:text-white font-semibold text-sm">{year}</span>
        </div>

        <HeaderIconButton
          aria-label={t('planning.quarterly.nextYearAria')}
          title={t('planning.quarterly.nextYearTitle')}
          type="button"
          onClick={() => handleYearChange(year + 1)}
        >
          <Icon name="chevron-right" size="sm" />
        </HeaderIconButton>
      </div>

      <div className="flex items-center gap-1.5">
        {([1, 2, 3, 4] as const).map((q) => (
          <Button
            key={q}
            className={`h-auto min-h-0 rounded-md px-3 py-1.5 text-sm font-medium shadow-none ${
              quarter === q ? 'shadow-md' : ''
            }`}
            title={t('planning.quarterly.quarterButtonTitle', { q })}
            type="button"
            variant={quarter === q ? 'primary' : 'secondary'}
            onClick={() => handleQuarterClick(q)}
          >
            Q{q}
          </Button>
        ))}
      </div>
    </div>
  );
}
