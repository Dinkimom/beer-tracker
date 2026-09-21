/**
 * Компонент состояния ошибки для TaskTimeline
 */

interface TaskTimelineErrorProps {
  error: string;
}

export function TaskTimelineError({ error }: TaskTimelineErrorProps) {
  return (
    <div className="py-4 text-sm text-red-500 dark:text-red-400">
      {error}
    </div>
  );
}

