import { describe, expect, it, vi } from 'vitest';

import {
  applyControlsBarViewModeChange,
  resolveControlsBarViewModeSelectValue,
  resolveTasksReloadButtonTitle,
} from './sprintPlannerControlsBarHelpers';

const t = (key: string) => key;

describe('resolveTasksReloadButtonTitle', () => {
  it('показывает статус загрузки, пока задачи обновляются', () => {
    expect(resolveTasksReloadButtonTitle(true, 12, t)).toBe('sprintPlanner.controls.reloadInProgress');
  });

  it('предлагает обновить из трекера, когда спринт выбран', () => {
    expect(resolveTasksReloadButtonTitle(false, 12, t)).toBe('sprintPlanner.controls.reloadFromTracker');
  });

  it('просит выбрать спринт, если его нет', () => {
    expect(resolveTasksReloadButtonTitle(false, null, t)).toBe('sprintPlanner.controls.selectSprintFirst');
  });
});

describe('resolveControlsBarViewModeSelectValue', () => {
  it('отличает фичи от свимлейнов; скрытую занятость считает свимлейном', () => {
    expect(resolveControlsBarViewModeSelectValue('features')).toBe('features');
    expect(resolveControlsBarViewModeSelectValue('occupancy')).toBe('swimlanes');
    expect(resolveControlsBarViewModeSelectValue('full')).toBe('swimlanes');
  });
});

describe('applyControlsBarViewModeChange', () => {
  it('включает режим по фичам отдельным значением', () => {
    const setViewMode = vi.fn();
    applyControlsBarViewModeChange('features', setViewMode);
    expect(setViewMode).toHaveBeenCalledWith('features');
  });
});
