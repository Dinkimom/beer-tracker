import { getEffectiveTimelineStartFromCreation } from '@/utils/dateUtils';

import { dateTimeToFractionalCellInRange } from '../../utils/sprintCellUtils';

export function computeActualPhaseTimelineBounds(input: {
  sprintStartDate: Date;
  taskCreatedAt?: string | null;
  totalParts: number;
}): {
  leftPercent: number;
  nowCell: number;
  spanCells: number;
  timelineStartCell: number;
  widthPercent: number;
} {
  const toCell = (d: Date) =>
    dateTimeToFractionalCellInRange(input.sprintStartDate, d, input.totalParts);
  const nowFractionalCell = toCell(new Date());
  const nowCell = Math.min(nowFractionalCell, input.totalParts);
  const timelineStartCell = input.taskCreatedAt
    ? Math.max(
        0,
        Math.min(
          input.totalParts,
          toCell(getEffectiveTimelineStartFromCreation(new Date(input.taskCreatedAt)))
        )
      )
    : 0;
  const spanCells = nowCell - timelineStartCell;
  return {
    leftPercent: (timelineStartCell / input.totalParts) * 100,
    nowCell,
    spanCells,
    timelineStartCell,
    widthPercent: spanCells > 0 ? (spanCells / input.totalParts) * 100 : 0,
  };
}
