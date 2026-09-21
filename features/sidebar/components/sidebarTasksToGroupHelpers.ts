import type { SidebarMainTab } from '../hooks/useSidebarTabsState';
import type { Task } from '@/types';

export function resolveSidebarTasksToGroup(params: {
  activeTab: 'all' | 'dev' | 'qa';
  allTasks: Task[];
  backlogTasks: Task[];
  devTasks: Task[];
  invalidTasks: Array<{ task: Task }>;
  mainTab: SidebarMainTab;
  qaTasks: Task[];
}): Task[] {
  if (params.mainTab === 'backlog') return params.backlogTasks;
  if (params.mainTab === 'invalid') return params.invalidTasks.map(({ task }) => task);
  if (params.mainTab !== 'tasks') return [];
  if (params.activeTab === 'all') return params.allTasks;
  if (params.activeTab === 'dev') return params.devTasks;
  return params.qaTasks;
}
