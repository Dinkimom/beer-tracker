import {
  changeIssueStatus,
  getIssueTransitions,
} from '@/lib/beerTrackerApi';
import { pickDoneTransition, type SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';

async function closeSingleTrackerGoalTask(
  goalTaskId: string,
  completionRules: SprintTaskCompletionRules | null
): Promise<void> {
  const transitions = await getIssueTransitions(goalTaskId);
  if (transitions.length === 0) return;

  const closeTransition = pickDoneTransition(transitions, completionRules);
  if (!closeTransition) {
    console.warn('Close transition not found for goal task:', goalTaskId);
    return;
  }

  const closeSuccess = await changeIssueStatus(goalTaskId, closeTransition.id, 'fixed');
  if (!closeSuccess) {
    console.error('Failed to close goal task:', goalTaskId);
  }
}

export async function closeTrackerGoalTasks(
  goalTasks: Array<{ id: string; source?: 'sprint_goals' | 'tracker' }>,
  completionRules: SprintTaskCompletionRules | null
): Promise<void> {
  for (const goalTask of goalTasks) {
    if (goalTask.source === 'sprint_goals') continue;
    try {
      await closeSingleTrackerGoalTask(goalTask.id, completionRules);
    } catch (error) {
      console.error('Failed to close goal task:', error);
    }
  }
}
