'use client';

import type { BurndownChartDataPoint } from './BurndownAreaChart';

import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

import { BurndownChartCustomTooltip } from './BurndownChartCustomTooltip';

export function BurndownChartPinnedTooltipOverlay({
  changelogTypeLabels,
  clearPinned,
  locale,
  pinnedMetricType,
  pinnedPoint,
  pinnedPosition,
  theme,
}: {
  changelogTypeLabels: Record<string, string>;
  clearPinned: () => void;
  locale: string;
  pinnedMetricType: 'SP' | 'TP';
  pinnedPoint: BurndownChartDataPoint;
  pinnedPosition: { x: number; y: number };
  theme: 'dark' | 'light';
}) {
  const { t } = useI18n();

  if (typeof document === 'undefined') {
    return null;
  }

  const maxLeft = typeof window !== 'undefined' ? window.innerWidth - 380 : pinnedPosition.x + 12;
  const maxTop = typeof window !== 'undefined' ? window.innerHeight - 320 : 0;

  return createPortal(
    <>
      <Button
        aria-label={t('burndown.accessibility.closePinnedTooltip')}
        className="fixed inset-0 z-40 !cursor-default !rounded-none !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent focus-visible:!ring-0 dark:hover:!bg-transparent"
        type="button"
        variant="ghost"
        onClick={clearPinned}
      />
      <div
        aria-label={t('burndown.accessibility.dayChangelogDialog')}
        className="fixed z-50 cursor-default"
        role="dialog"
        style={{
          left: Math.min(pinnedPosition.x + 12, maxLeft),
          top: Math.max(8, Math.min(pinnedPosition.y, maxTop)),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <BurndownChartCustomTooltip
          active
          changelogTypeLabels={changelogTypeLabels}
          locale={locale}
          metricType={pinnedMetricType}
          payload={[{ payload: pinnedPoint }]}
          t={t}
          theme={theme}
        />
      </div>
    </>,
    document.body
  );
}
