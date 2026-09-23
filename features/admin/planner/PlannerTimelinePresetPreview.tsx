'use client';

import type { CountPlural } from '@/features/admin/planner/plannerTimelineRangeGeometry';
import type { EstimateScalePreviewRow, PlannerTimelineScale } from '@/lib/plannerTimelineScale';

import { useI18n } from '@/contexts/LanguageContext';
import { ruCountPlural } from '@/features/admin/planner/plannerTimelineRangeGeometry';
import { buildEstimateScalePreview } from '@/lib/plannerTimelineScale';

type Translate = (key: string, params?: Record<string, number | string>) => string;

const SLOT_WORD: Record<CountPlural, string> = {
  few: 'admin.plannerTimeline.timeslotFew',
  many: 'admin.plannerTimeline.timeslotMany',
  one: 'admin.plannerTimeline.timeslotOne',
};

function countForm(count: number, language: string): CountPlural {
  if (language === 'ru') return ruCountPlural(count);
  return count === 1 ? 'one' : 'many';
}

function shortSlotUnit(count: number, language: string, t: Translate): string {
  if (language === 'ru') return t('admin.plannerTimeline.slotShort');
  return t(SLOT_WORD[countForm(count, language)]);
}

function formatPreviewDuration(row: EstimateScalePreviewRow, language: string, t: Translate): string {
  if (row.wholeDays === 0) {
    return t('admin.plannerTimeline.slotsOnly', {
      slots: row.remainderSlots,
      unit: shortSlotUnit(row.remainderSlots, language, t),
    });
  }
  if (row.remainderSlots === 0) {
    return t('admin.plannerTimeline.daysExact', { days: row.wholeDays });
  }
  return t('admin.plannerTimeline.daysAndSlots', {
    days: row.wholeDays,
    slots: row.remainderSlots,
    unit: shortSlotUnit(row.remainderSlots, language, t),
  });
}

export function PlannerTimelinePresetPreview({ scale }: { scale: PlannerTimelineScale }) {
  const { language, t } = useI18n();
  if (scale.estimateUnit === 'custom') return null;
  const preview = buildEstimateScalePreview(scale);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t('admin.plannerTimeline.previewTitle')}
      </h2>
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-gray-500 dark:text-gray-400">
          <tr>
            <th className="py-1 pr-3 font-medium">{t('admin.plannerTimeline.columnSp')}</th>
            <th className="py-1 pr-3 font-medium">{t('admin.plannerTimeline.columnSlots')}</th>
            <th className="py-1 font-medium">{t('admin.plannerTimeline.columnDays')}</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((row) => (
            <tr key={row.storyPoints} className="border-t border-gray-100 dark:border-gray-700">
              <td className="py-1.5 pr-3">{row.storyPoints}</td>
              <td className="py-1.5 pr-3">{row.timeslots}</td>
              <td className="py-1.5">{formatPreviewDuration(row, language, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
