import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task } from '@/types';

interface OccupancyTaskCellAssigneeRowProps {
  assigneeDisplayName?: string;
  fields: OccupancyRowFieldsVisibility;
  qaDisplayName?: string;
  shouldShowTp: boolean;
  task: Task;
}

export function OccupancyTaskCellAssigneeRow({
  assigneeDisplayName,
  fields,
  qaDisplayName,
  shouldShowTp,
  task,
}: OccupancyTaskCellAssigneeRowProps) {
  if (assigneeDisplayName && fields.showAssignee) {
    return (
      <>
        <span>{assigneeDisplayName}</span>
        {shouldShowTp && qaDisplayName && fields.showQa && (
          <>
            <span className="mx-1.5"> · </span>
            <span>{qaDisplayName}</span>
          </>
        )}
      </>
    );
  }

  return (
    <>
      {task.team && task.team !== 'QA' && fields.showAssignee && fields.showTeam && (
        <>
          <span className="capitalize">{task.team}</span>
          {qaDisplayName && shouldShowTp && fields.showQa && <span className="mx-1.5"> · </span>}
        </>
      )}
      {qaDisplayName && shouldShowTp && fields.showQa && <span>{qaDisplayName}</span>}
      {fields.showAssignee &&
        !assigneeDisplayName &&
        !(task.team && fields.showTeam) &&
        !qaDisplayName &&
        'Нет исполнителя'}
    </>
  );
}
