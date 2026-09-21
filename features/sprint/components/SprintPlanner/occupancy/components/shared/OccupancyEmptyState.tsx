'use client';

interface OccupancyEmptyStateProps {
  globalNameFilter: string;
  /** Колонка задач + колонки дней */
  tableColSpan: number;
}

export function OccupancyEmptyState({ globalNameFilter, tableColSpan }: OccupancyEmptyStateProps) {
  return (
    <tr>
      <td
        className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        colSpan={tableColSpan}
      >
        {globalNameFilter ? 'Нет задач по фильтру' : 'Нет задач в спринте'}
      </td>
    </tr>
  );
}
