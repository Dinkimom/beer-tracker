import type { ValidationIssue } from '@/features/task/utils/taskValidation';
import type { Task } from '@/types';

function collectMissingStoryPointsIssue(task: Task): ValidationIssue | null {
  if (task.storyPoints === undefined || task.storyPoints === null) {
    return { type: 'missing-sp' };
  }
  return null;
}

function collectMissingTestPointsIssue(task: Task): ValidationIssue | null {
  if (task.testPoints === undefined || task.testPoints === null) {
    return { type: 'missing-tp' };
  }
  return null;
}

function collectMissingProductTeamIssue(task: Task): ValidationIssue | null {
  if (!task.productTeam || task.productTeam.length === 0) {
    return { type: 'missing-product-team' };
  }
  return null;
}

function collectMissingFunctionalTeamIssue(task: Task): ValidationIssue | null {
  if (!task.functionalTeam) {
    return { type: 'missing-functional-team' };
  }
  return null;
}

function collectMissingStageIssue(task: Task): ValidationIssue | null {
  if (!task.stage) {
    return { type: 'missing-stage' };
  }
  return null;
}

function collectMultipleSprintsIssue(task: Task): ValidationIssue | null {
  if (task.sprints && task.sprints.length > 1) {
    return {
      type: 'multiple-sprints',
      params: {
        count: task.sprints.length,
        sprints: task.sprints.map((s) => s.display).join(', '),
      },
    };
  }
  return null;
}

const TASK_VALIDATION_COLLECTORS = [
  collectMissingStoryPointsIssue,
  collectMissingTestPointsIssue,
  collectMissingProductTeamIssue,
  collectMissingFunctionalTeamIssue,
  collectMissingStageIssue,
  collectMultipleSprintsIssue,
] as const;

/** Фиксированный набор правил; позже критерии невалидной задачи должны настраиваться. */
export function collectTaskValidationIssues(task: Task): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const collect of TASK_VALIDATION_COLLECTORS) {
    const issue = collect(task);
    if (issue) issues.push(issue);
  }
  return issues;
}
