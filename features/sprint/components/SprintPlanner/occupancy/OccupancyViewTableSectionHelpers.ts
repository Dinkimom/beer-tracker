import type { CSSProperties } from 'react';

interface OccupancyTableWrapperStyleInput {
  tableWidth: number | undefined;
}

export function occupancyTableWrapperClassName(tableWidth: number | undefined): string {
  return typeof tableWidth === 'number' && tableWidth > 0
    ? 'relative box-border w-full max-w-none shrink-0'
    : 'relative min-w-0';
}

export function occupancyTableWrapperStyle(
  input: OccupancyTableWrapperStyleInput
): { minWidth: string; overflowX: 'clip'; width: string } | undefined {
  const { tableWidth } = input;
  if (typeof tableWidth !== 'number' || tableWidth <= 0) return undefined;
  return {
    width: '100%',
    minWidth: `max(100%, ${tableWidth}px)`,
    overflowX: 'clip' as const,
  };
}

export function occupancyTableStyle(tableWidth: number | undefined): CSSProperties {
  return {
    tableLayout: 'fixed',
    ...(typeof tableWidth === 'number' && tableWidth > 0
      ? { width: '100%', minWidth: tableWidth }
      : {}),
  };
}

export function occupancyTableFooterMinWidth(tableWidth: number | undefined): { minWidth: string } | undefined {
  if (typeof tableWidth !== 'number' || tableWidth <= 0) return undefined;
  return { minWidth: `max(100%, ${tableWidth}px)` };
}
