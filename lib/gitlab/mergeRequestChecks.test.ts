import type { GitLabPipelineJobResponse } from './mergeRequestChecksHelpers';
import type { GitLabFactEvent } from './mergeRequestFactTypes';

import { describe, expect, it } from 'vitest';

import {
  aggregateJobsStatus,
  isCodeQualityStage,
  selectTestJobs,
} from './mergeRequestChecksHelpers';
import {
  batchGitlabFactEventsWithinWindow,
  filterGitlabFactEventsForTimeline,
} from './mergeRequestFactTimelineHelpers';

describe('mergeRequestChecks helpers', () => {
  it('detects code quality stage by title', () => {
    expect(isCodeQualityStage('Code quality')).toBe(true);
    expect(isCodeQualityStage('quality')).toBe(true);
    expect(isCodeQualityStage('test')).toBe(false);
  });

  it('aggregates status for required jobs', () => {
    expect(aggregateJobsStatus([{ status: 'success' }, { status: 'success' }])).toBe(true);
    expect(aggregateJobsStatus([{ status: 'success' }, { status: 'failed' }])).toBe(false);
    expect(aggregateJobsStatus([{ status: 'running' }, { status: 'success' }])).toBeNull();
    expect(aggregateJobsStatus([])).toBeNull();
  });

  it('selects only required test jobs', () => {
    const jobs: GitLabPipelineJobResponse[] = [
      { name: 'Tests: E2E (Blackbox)', status: 'success' },
      { name: 'Server: Whitebox - Codeception', status: 'success' },
      { name: 'Sandbox', status: 'success' },
    ];
    const selected = selectTestJobs(jobs);
    expect(selected).toHaveLength(2);
    expect(selected.map((j) => j.name)).toEqual([
      'Tests: E2E (Blackbox)',
      'Server: Whitebox - Codeception',
    ]);
  });
});

describe('filterGitlabFactEventsForTimeline', () => {
  it('keeps all event kinds sorted by time', () => {
    const events: GitLabFactEvent[] = [
      { at: new Date(7000).toISOString(), kind: 'merged' },
      { at: new Date(2000).toISOString(), kind: 'pipeline_success', label: '#1' },
      { at: new Date(500).toISOString(), kind: 'approved' },
      { at: new Date(3000).toISOString(), kind: 'pipeline_failed', label: '#2' },
    ];
    expect(filterGitlabFactEventsForTimeline(events).map((e) => e.kind)).toEqual([
      'approved',
      'pipeline_success',
      'pipeline_failed',
      'merged',
    ]);
  });
});

describe('batchGitlabFactEventsWithinWindow', () => {
  const t0 = Date.parse('2026-01-01T12:00:00.000Z');

  function atOffsetMinutes(minutes: number): string {
    return new Date(t0 + minutes * 60_000).toISOString();
  }

  it('batches consecutive same kind within 1 hour gaps', () => {
    const events: GitLabFactEvent[] = [
      { at: atOffsetMinutes(0), kind: 'pipeline_failed', label: '#1' },
      { at: atOffsetMinutes(50), kind: 'pipeline_failed', label: '#2' },
      { at: atOffsetMinutes(100), kind: 'pipeline_failed', label: '#3' },
    ];
    const batches = batchGitlabFactEventsWithinWindow(events);
    expect(batches).toHaveLength(1);
    expect(batches[0].items.map((e) => e.label)).toEqual(['#1', '#2', '#3']);
    expect(batches[0].at).toBe(atOffsetMinutes(0));
  });

  it('starts a new batch when gap from previous event exceeds 1 hour', () => {
    const events: GitLabFactEvent[] = [
      { at: atOffsetMinutes(0), kind: 'approved' },
      { at: atOffsetMinutes(60), kind: 'approved' },
      { at: atOffsetMinutes(121), kind: 'approved' },
    ];
    const batches = batchGitlabFactEventsWithinWindow(events);
    expect(batches).toHaveLength(2);
    expect(batches[0].items).toHaveLength(2);
    expect(batches[1].items).toHaveLength(1);
  });

  it('batches each kind independently across interleaved events', () => {
    const events: GitLabFactEvent[] = [
      { at: atOffsetMinutes(0), kind: 'pipeline_failed', label: 'fail-1' },
      { at: atOffsetMinutes(1), kind: 'approved', label: 'a1' },
      { at: atOffsetMinutes(2), kind: 'pipeline_failed', label: 'fail-2' },
      { at: atOffsetMinutes(3), kind: 'approved', label: 'a2' },
    ];
    const batches = batchGitlabFactEventsWithinWindow(events);
    expect(batches).toHaveLength(2);
    const failed = batches.find((b) => b.kind === 'pipeline_failed');
    const approved = batches.find((b) => b.kind === 'approved');
    expect(failed?.items.map((e) => e.label)).toEqual(['fail-1', 'fail-2']);
    expect(approved?.items.map((e) => e.label)).toEqual(['a1', 'a2']);
  });
});
