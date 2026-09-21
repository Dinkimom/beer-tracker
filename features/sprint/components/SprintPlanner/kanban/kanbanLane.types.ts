import type { Developer, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

export interface KanbanColumnHeaderData {
  column: BoardColumn;
  filteredTasks: Task[];
  tasks: Task[];
  totalSp: number;
  totalTp: number;
}

export interface KanbanLaneWithColumns {
  assigneeKey?: string;
  assigneeName?: string;
  columnsWithHeaderData: KanbanColumnHeaderData[];
  developer?: Developer | null;
  laneKey?: string;
  laneName?: string;
  parentDisplay?: string;
  parentKey?: string;
  tasks: Task[];
}
