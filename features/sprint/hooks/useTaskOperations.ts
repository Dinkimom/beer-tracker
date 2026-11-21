/**
 * Операции с задачей на доске: смена статуса, перенос в другой спринт, удаление из спринта.
 */

import { type UseTaskSprintOperationsProps, useTaskSprintOperations } from './useTaskOperations/hooks/useTaskSprintOperations';
import { useTaskStatusOperations } from './useTaskOperations/hooks/useTaskStatusOperations';


export function useTaskOperations(props: UseTaskSprintOperationsProps) {
  const { changeStatus } = useTaskStatusOperations({ setTasks: props.setTasks, tasks: props.board.tasks });
  const { moveToSprint, removeFromSprint } = useTaskSprintOperations(props);
  return { changeStatus, moveToSprint, removeFromSprint };
}
