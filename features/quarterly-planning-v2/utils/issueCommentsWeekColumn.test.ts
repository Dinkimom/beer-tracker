import type { SprintInfo } from '@/features/sprint/components/SprintPlanner/occupancy/components/table/OccupancyTableHeader';

import { describe, expect, it } from 'vitest';

import {
  findWeekIndexForDate,
  groupIssueCommentsByWeekColumn,
} from './issueCommentsWeekColumn';
import { buildQuarterlyWeekColumns } from './quarterlyTimelineHeader';

const sprintInfos: SprintInfo[] = [
  {
    id: 1,
    name: 'Sprint 2601',
    startDate: new Date('2026-01-06T00:00:00'),
    endDate: new Date('2026-01-17T23:59:59'),
  },
];

describe('issueCommentsWeekColumn', () => {
  it('maps comment date to week column index', () => {
    const weekColumns = buildQuarterlyWeekColumns(sprintInfos);
    const idx = findWeekIndexForDate(new Date('2026-01-08T12:00:00'), weekColumns, sprintInfos);
    expect(idx).toBe(0);
  });

  it('groups comments by week column', () => {
    const weekColumns = buildQuarterlyWeekColumns(sprintInfos);
    const grouped = groupIssueCommentsByWeekColumn(
      [
        {
          id: 1,
          text: 'hello',
          createdAt: '2026-01-08T10:00:00.000Z',
          updatedAt: '2026-01-08T10:00:00.000Z',
          createdBy: { id: 'u1', display: 'User' },
        },
      ],
      weekColumns,
      sprintInfos
    );
    expect(grouped.get(0)?.length).toBe(1);
  });
});
