'use client';

import { Icon } from '@/components/Icon';

export function BurndownChartLoadingBody({ message }: { message: string }) {
  return (
    <div className="text-center">
      <Icon className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" name="spinner" />
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
