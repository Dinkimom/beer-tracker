import type * as AvailabilityRepository from '@/lib/boardAvailability/boardAvailabilityEventsRepository';
import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { TeamMember } from '@/types/team';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';
import { fetchAllTeamMembersForOrg, listTeams } from '@/lib/staffTeams';

import { applyQuarterlyPlanOps, getQuarterlyPlan, saveQuarterlyPlan } from './quarterlyPlanService';
import { fetchQuarterlyPlanContent, saveQuarterlyPlanContent } from './quarterlyPlansRepository';

vi.mock('@/lib/staffTeams', () => ({
  enrichPlannerTeamMembersFromTracker: vi.fn((_org: string, members: unknown) => Promise.resolve(members)),
  fetchAllTeamMembersForOrg: vi.fn(),
  listTeams: vi.fn(),
}));
vi.mock('@/lib/sprints/sprintContextTeamMembers', () => ({
  loadRoleResolutionContext: vi.fn(() => Promise.resolve(undefined)),
}));
vi.mock('@/lib/boardAvailability/boardAvailabilityEventsRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof AvailabilityRepository>()),
  listBoardAvailabilityEvents: vi.fn().mockResolvedValue([
    {
      end_date: '2026-10-16',
      event_type: 'duty',
      id: 'duty-1',
      member_id: 'staff:staff-2',
      member_name: 'staff-2',
      start_date: '2026-10-12',
      tech_sprint_type: null,
    },
  ]),
}));
vi.mock('./quarterlyPlansRepository', () => ({
  fetchQuarterlyPlanContent: vi.fn(),
  saveQuarterlyPlanContent: vi.fn(),
}));

const Q4 = { quarter: 4, year: 2026 } as const;
const TEAM_ID = '11111111-1111-4111-8111-111111111111';

function member(staffId: string, trackerUid: string | null): TeamMember {
  return {
    active: true,
    displayName: staffId,
    firstName: staffId,
    lastName: '',
    login: staffId,
    team: { board: 42, queue: 'DEMO', slug: 'demo', title: 'Demo', uid: TEAM_ID },
    tracker_uid: trackerUid,
    uid: staffId,
  };
}

function content(memberId: string) {
  return {
    assignments: [{ epicId: 'e1', id: 'a1', memberId, startWeek: 0, weeks: 2 }],
    directions: [{ id: 'd1', teamId: TEAM_ID, title: 'Checkout' }],
    epics: [{ directionId: 'd1', id: 'e1', status: 'backlog', title: 'Payment' }],
    links: [],
    notes: [],
  };
}

function sprint(id: number, startDate: string, endDate: string, boardId = '42') {
  return { board: { display: '', id: boardId, self: '' }, endDate, id, name: `Sprint ${id}`, startDate };
}

describe('quarterlyPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiCache.clear();
    vi.mocked(listTeams).mockResolvedValue([
      { id: TEAM_ID, title: 'Demo', tracker_board_id: '42' },
    ] as never);
    vi.mocked(fetchAllTeamMembersForOrg).mockResolvedValue([member('staff-1', 'tracker-1'), member('staff-2', null)]);
  });

  it('отдаёт людей как исполнителей планера и спринты доски, задевающие квартал', async () => {
    vi.mocked(fetchQuarterlyPlanContent).mockResolvedValue({ content: content('staff-1') as never, version: 3 });
    const issueTracker = {
      listSprints: vi.fn().mockResolvedValue([
        sprint(2, '2026-10-12', '2026-10-23'),
        sprint(1, '2026-09-14', '2026-09-25'),
        // Кончается в субботу перед кварталом, начинается с выходных — не попадает (QW5).
        sprint(3, '2026-09-26', '2026-09-27'),
        sprint(4, '2026-12-28', '2027-01-08'),
        // Спринт соседней доски, где есть задачи этой: в ленту команды не попадает (QB3).
        sprint(5, '2026-10-26', '2026-11-08', '112'),
      ]),
    } as unknown as IssueTrackerProviderClient;

    const { plan, version } = await getQuarterlyPlan({ issueTracker, organizationId: 'org-1', ref: Q4 });

    expect(version).toBe(3);
    expect(plan.assignments[0]?.memberId).toBe('tracker-1');
    expect(plan.teams).toHaveLength(1);
    expect(plan.teams[0]?.members.map((developer) => developer.id)).toEqual(['tracker-1', 'staff:staff-2']);
    expect(plan.teams[0]?.sprints.map((item) => item.id)).toEqual([2, 4]);
  });

  it('сохраняет людей по staff_id поверх ожидаемой версии', async () => {
    vi.mocked(saveQuarterlyPlanContent).mockResolvedValue(5);
    await expect(
      saveQuarterlyPlan({ content: content('staff:staff-2'), ifVersion: 4, organizationId: 'org-1', ref: Q4 })
    ).resolves.toEqual({ status: 'saved', version: 5 });
    const saved = vi.mocked(saveQuarterlyPlanContent).mock.calls[0]![0];
    expect(saved.ifVersion).toBe(4);
    expect(saved.content.assignments[0]?.memberId).toBe('staff-2');
  });

  it('чужое сохранение между чтением и записью — конфликт (QS5)', async () => {
    vi.mocked(saveQuarterlyPlanContent).mockResolvedValue(null);
    await expect(
      saveQuarterlyPlan({ content: content('tracker-1'), ifVersion: 4, organizationId: 'org-1', ref: Q4 })
    ).resolves.toEqual({ status: 'conflict' });
  });

  it('не пишет план с чужой командой или незнакомым человеком', async () => {
    const foreignTeam = { ...content('tracker-1'), directions: [{ id: 'd1', teamId: 'other', title: 'X' }] };
    await expect(
      saveQuarterlyPlan({ content: foreignTeam, ifVersion: 0, organizationId: 'org-1', ref: Q4 })
    ).resolves.toEqual({ error: 'direction d1: unknown team other', status: 'invalid' });
    await expect(
      saveQuarterlyPlan({ content: content('tracker-9'), ifVersion: 0, organizationId: 'org-1', ref: Q4 })
    ).resolves.toEqual({ error: 'assignment a1: unknown member tracker-9', status: 'invalid' });
    expect(saveQuarterlyPlanContent).not.toHaveBeenCalled();
  });

  describe('applyQuarterlyPlanOps', () => {
    const ops = [
      { epicId: 'e1', memberId: 'staff:staff-2', op: 'assign', ref: '$a', span: { startWeek: 3, weeks: 1 } },
    ] as const;

    beforeEach(() => {
      vi.mocked(fetchQuarterlyPlanContent).mockResolvedValue({ content: content('staff-1') as never, version: 7 });
    });

    it('устаревшая версия — конфликт до применения (QM6)', async () => {
      await expect(
        applyQuarterlyPlanOps({ dryRun: false, ifVersion: 6, ops: [...ops], organizationId: 'org-1', ref: Q4 })
      ).resolves.toEqual({ status: 'conflict', version: 7 });
      expect(saveQuarterlyPlanContent).not.toHaveBeenCalled();
    });

    it('dryRun показывает план после пакета и ничего не пишет (QM4)', async () => {
      const result = await applyQuarterlyPlanOps({ dryRun: true, ifVersion: 7, ops: [...ops], organizationId: 'org-1', ref: Q4 });
      expect(result.status).toBe('preview');
      expect(result.status === 'preview' && result.content.assignments.map((a) => a.memberId)).toEqual([
        'tracker-1',
        'staff:staff-2',
      ]);
      expect(saveQuarterlyPlanContent).not.toHaveBeenCalled();
      // Дежурство staff-2 — на неделе 2 (12–16.10), новое назначение — на неделе 3: риска нет.
      expect(result.status === 'preview' && result.dutyRiskAssignmentIds).toEqual([]);
      expect(result.status === 'preview' && result.issues).toEqual([]);
    });

    it('предпросмотр называет проблемы и риски дежурства, как доска (QM4)', async () => {
      const result = await applyQuarterlyPlanOps({
        dryRun: true,
        ifVersion: 7,
        ops: [
          { epicId: 'e1', memberId: 'staff:staff-2', op: 'assign', ref: '$duty', span: { startWeek: 2, weeks: 1 } },
          { epicId: 'e1', memberId: 'staff:staff-2', op: 'assign', ref: '$twice', span: { startWeek: 2, weeks: 1 } },
          { epicId: 'e1', memberId: 'staff:staff-2', op: 'assign', ref: '$thrice', span: { startWeek: 2, weeks: 1 } },
        ],
        organizationId: 'org-1',
        ref: Q4,
      });
      if (result.status !== 'preview') throw new Error(result.status);
      expect(result.dutyRiskAssignmentIds).toEqual([result.refs.$duty, result.refs.$twice, result.refs.$thrice]);
      expect(result.issues.map((issue) => issue.parallel)).toEqual([true, true, true]);
    });

    it('пишет пакет поверх версии и возвращает ссылки на созданное', async () => {
      vi.mocked(saveQuarterlyPlanContent).mockResolvedValue(8);
      const result = await applyQuarterlyPlanOps({ dryRun: false, ifVersion: 7, ops: [...ops], organizationId: 'org-1', ref: Q4 });
      expect(result.status === 'saved' && result.version).toBe(8);
      expect(result.status === 'saved' && Object.keys(result.refs)).toEqual(['$a']);
      const saved = vi.mocked(saveQuarterlyPlanContent).mock.calls[0]![0];
      expect(saved.ifVersion).toBe(7);
      expect(saved.content.assignments.map((a) => a.memberId)).toEqual(['staff-1', 'staff-2']);
    });

    it('ошибка операции называет её номер', async () => {
      await expect(
        applyQuarterlyPlanOps({
          dryRun: false,
          ifVersion: 7,
          ops: [{ epicId: 'nope', op: 'removeEpic' }],
          organizationId: 'org-1',
          ref: Q4,
        })
      ).resolves.toEqual({ error: 'removeEpic: unknown epic nope', opIndex: 0, status: 'invalid' });
    });
  });
});
