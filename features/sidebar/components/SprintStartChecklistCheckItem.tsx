'use client';

interface SprintStartChecklistCheckItemProps {
  children?: React.ReactNode;
  passed: boolean;
  title: string;
}

export function SprintStartChecklistCheckItem({
  passed,
  title,
  children,
}: SprintStartChecklistCheckItemProps) {
  return (
    <div
      className={`rounded-lg border border-l-4 py-2.5 px-3 ${
        passed
          ? 'bg-green-50 dark:bg-green-900/25 border-green-200 dark:border-green-800 border-l-green-600 dark:border-l-green-500'
          : 'bg-red-50 dark:bg-red-900/25 border-red-200 dark:border-red-800 border-l-red-600 dark:border-l-red-500'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
            {title}
          </p>
          {children && (
            <div className="text-xs text-gray-900 dark:text-gray-100 mt-1.5 leading-relaxed">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
