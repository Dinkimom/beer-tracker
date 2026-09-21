import { Icon } from '@/components/Icon';

interface TaskCardSprintBadgesProps {
  sprintBadge?: { display: string; id: string } | null;
}

export function TaskCardSprintBadges({ sprintBadge }: TaskCardSprintBadgesProps) {
  if (!sprintBadge) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
        <Icon className="w-3 h-3" name="calendar" />
        {sprintBadge.display}
      </span>
    </div>
  );
}
