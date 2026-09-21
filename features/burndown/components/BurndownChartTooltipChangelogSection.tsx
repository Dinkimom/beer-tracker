'use client';

import type { BurndownDayChangelogItem } from './burndownChartTooltipContext';

import { burndownChangelogItemDisplayType } from './burndownChartTooltipFilterHelpers';
import {
  BURNDOWN_TOOLTIP_CHANGELOG_MAX_HEIGHT,
  formatBurndownChangelogChange,
  truncateBurndownSummary,
} from './burndownChartTooltipHelpers';

interface BurndownChartTooltipChangelogSectionProps {
  bgColor: string;
  borderColor: string;
  changeHeader: string;
  changelogTypeLabels: Record<string, string>;
  dayChangelog: BurndownDayChangelogItem[];
  isDark: boolean;
  isTP: boolean;
  mutedColor: string;
  noChangesLabel: string;
  remainingHeader: string;
}

export function BurndownChartTooltipChangelogSection({
  dayChangelog,
  isTP,
  mutedColor,
  borderColor,
  bgColor,
  isDark,
  changeHeader,
  remainingHeader,
  changelogTypeLabels,
  noChangesLabel,
}: BurndownChartTooltipChangelogSectionProps) {
  if (dayChangelog.length === 0) {
    return (
      <div style={{ fontSize: 12, color: mutedColor, paddingTop: 4 }}>
        {noChangesLabel}
      </div>
    );
  }

  return (
    <div
      style={{
        maxHeight: BURNDOWN_TOOLTIP_CHANGELOG_MAX_HEIGHT,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: 10,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>
            <th style={{ textAlign: 'left', padding: '4px 8px 4px 0', fontWeight: 500, position: 'sticky', top: 0, backgroundColor: bgColor, zIndex: 1 }} />
            <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500, position: 'sticky', top: 0, backgroundColor: bgColor, zIndex: 1, whiteSpace: 'nowrap' }}>
              {changeHeader}
            </th>
            <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500, position: 'sticky', top: 0, backgroundColor: bgColor, zIndex: 1, whiteSpace: 'nowrap' }}>
              {remainingHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {dayChangelog.map((item: BurndownDayChangelogItem, rowIdx: number) => {
            const summary = truncateBurndownSummary(item.summary);
            const displayType = burndownChangelogItemDisplayType(item);
            const { changeStr, changeColor } = formatBurndownChangelogChange(item, isTP);
            const remainingVal = isTP ? item.remainingTP : item.remainingSP;
            return (
              <tr key={`${item.issueKey}-${item.type}-${rowIdx}-${changeStr}-${remainingVal}`} style={{ borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>
                <td style={{ padding: '6px 8px 6px 0', verticalAlign: 'top', minWidth: 0 }} title={item.summary}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 10,
                      color: mutedColor,
                      backgroundColor: isDark ? '#374151' : '#e5e7eb',
                      padding: '2px 6px',
                      borderRadius: 4,
                      marginBottom: 4,
                    }}
                  >
                    {changelogTypeLabels[displayType] ?? displayType}
                  </span>
                  <div style={{ marginTop: 2 }}>{summary}</div>
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'bottom', color: changeColor, fontWeight: 600 }}>
                  {changeStr}
                </td>
                <td style={{ padding: '6px 0', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
                  {remainingVal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
