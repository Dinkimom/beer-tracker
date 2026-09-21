import { OCCUPANCY_HEADER_ROW_HEIGHT_PX } from '../components/table/OccupancyTableHeader';

export function occupancyTimelineHeaderHeight(
  sprintCount: number,
  quarterlyWeekTimelineHeader: boolean
): number {
  if (sprintCount <= 1) {
    return OCCUPANCY_HEADER_ROW_HEIGHT_PX;
  }
  if (quarterlyWeekTimelineHeader) {
    return OCCUPANCY_HEADER_ROW_HEIGHT_PX * 3;
  }
  return 82;
}
