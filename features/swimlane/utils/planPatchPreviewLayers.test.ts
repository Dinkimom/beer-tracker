import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { assignPlanPatchPreviewLayers } from './planPatchPreviewLayers';

function position(taskId: string, startDay: number, duration = 2): TaskPosition {
  return { assignee: 'dev', duration, startDay, startPart: 0, taskId };
}

describe('assignPlanPatchPreviewLayers', () => {
  it('keeps a proposal on the first layer when the time is free', () => {
    const layers = assignPlanPatchPreviewLayers({
      occupants: [{ layer: 0, position: position('RND-1', 0) }],
      previews: [{ position: position('RND-2', 2), taskId: 'RND-2' }],
    });
    expect(layers.get('RND-2')).toBe(0);
  });

  it('lifts a proposal onto the next layer when it covers an existing card', () => {
    const layers = assignPlanPatchPreviewLayers({
      occupants: [{ layer: 0, position: position('RND-1', 4) }],
      previews: [{ position: position('RND-2', 4), taskId: 'RND-2' }],
    });
    expect(layers.get('RND-2')).toBe(1);
  });

  it('stacks two proposals that land on the same cells', () => {
    const layers = assignPlanPatchPreviewLayers({
      occupants: [],
      previews: [
        { position: position('RND-A', 1), taskId: 'RND-A' },
        { position: position('RND-B', 1), taskId: 'RND-B' },
      ],
    });
    expect(layers.get('RND-A')).toBe(0);
    expect(layers.get('RND-B')).toBe(1);
  });

  it('does not reuse the original card layer when the move still overlaps it', () => {
    const layers = assignPlanPatchPreviewLayers({
      occupants: [{ layer: 0, position: position('RND-1914', 0, 4) }],
      previews: [{ position: position('RND-1914', 0, 2), taskId: 'RND-1914' }],
    });
    expect(layers.get('RND-1914')).toBe(1);
  });
});
