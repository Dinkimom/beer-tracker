'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { CARD_MARGIN, WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { PHASE_FOCUS_RING_SOURCE } from '@/lib/planner-timeline';

interface SwimlaneLinkingSourceFrameProps {
  /** Вертикальные отступы строки (как у TaskBar / SwimlaneSegmentEditFrame) */
  containerStyle: React.CSSProperties;
  outlineRadiusClass?: string;
  rangeStartCell: number;
  timelineTotalParts?: number;
  totalCells: number;
  onCancel?: () => void;
}

/**
 * Режим создания связи: обводка источника как у редактора отрезков + кнопка отмены.
 */
export function SwimlaneLinkingSourceFrame({
  containerStyle,
  outlineRadiusClass = 'rounded-lg',
  rangeStartCell,
  timelineTotalParts = WORKING_DAYS * getPartsPerDay(),
  totalCells,
  onCancel,
}: SwimlaneLinkingSourceFrameProps) {
  const { t } = useI18n();

  const leftPercent = (rangeStartCell / timelineTotalParts) * 100;
  const widthPercent = (totalCells / timelineTotalParts) * 100;
  const barLeft = `calc(${leftPercent}% + ${CARD_MARGIN}px)`;
  const barWidth = `calc(${widthPercent}% - ${CARD_MARGIN * 2}px)`;
  const cancelButtonContainerLeft = `calc(${leftPercent}% + ${widthPercent}%)`;

  return (
    <div className="pointer-events-none absolute left-0 right-0" style={containerStyle}>
      <div
        aria-hidden
        className={`pointer-events-none absolute ${outlineRadiusClass} ${PHASE_FOCUS_RING_SOURCE}`}
        style={{ left: barLeft, width: barWidth, top: 0, bottom: 0, zIndex: 0 }}
      />
      {onCancel ? (
        <div
          className="pointer-events-auto absolute flex items-center justify-end gap-1 pl-1"
          data-swimlane-link-cancel
          style={{
            left: cancelButtonContainerLeft,
            top: 0,
            bottom: 0,
            zIndex: 2,
          }}
        >
          <Button
            aria-label={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
            className="!h-6 !w-6 !min-h-0 !min-w-0 !justify-center !p-0 text-red-600 transition-colors duration-200 focus-visible:outline-none dark:text-red-400 !border-gray-200 !bg-white !shadow-sm hover:!border-red-300 hover:!bg-red-50 hover:!shadow-md dark:!border-gray-600 dark:!bg-gray-800 dark:hover:!border-red-800 dark:hover:!bg-red-950"
            title={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
          >
            <Icon className="h-3.5 w-3.5" name="x" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
