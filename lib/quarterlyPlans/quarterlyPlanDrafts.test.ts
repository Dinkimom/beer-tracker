import type { QuarterlyPlanOp } from './quarterlyPlanOps';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareDraftAgentSession, recordDraftInAgentSession } from '@/lib/agentSessions/agentSessionService';

import {
  approveQuarterlyPlanDraft,
  loadQuarterlyPlanDraft,
  proposeQuarterlyPlan,
  quarterlyPlanProposalId,
  rejectQuarterlyPlanDraft,
} from './quarterlyPlanDrafts';
import { deleteQuarterlyPlanDraft, findQuarterlyPlanDraft, saveQuarterlyPlanDraft } from './quarterlyPlanDraftsRepository';
import { applyQuarterlyPlanOps } from './quarterlyPlanService';
import { fetchQuarterlyPlanContent } from './quarterlyPlansRepository';

vi.mock('@/lib/agentSessions/agentSessionService', () => ({
  prepareDraftAgentSession: vi.fn().mockResolvedValue({ id: 'session-1', messages: [] }),
  recordDraftInAgentSession: vi.fn().mockResolvedValue({ draftVersion: 1, repliesRecorded: 0, sessionId: 'session-1' }),
}));
vi.mock('./quarterlyPlanDraftsRepository', () => ({
  deleteQuarterlyPlanDraft: vi.fn().mockResolvedValue(true),
  findQuarterlyPlanDraft: vi.fn(),
  saveQuarterlyPlanDraft: vi.fn(),
}));
vi.mock('./quarterlyPlanService', () => ({ applyQuarterlyPlanOps: vi.fn() }));
vi.mock('./quarterlyPlansRepository', () => ({ fetchQuarterlyPlanContent: vi.fn() }));

const Q4 = { quarter: 4, year: 2026 } as const;
const owner = { organizationId: 'org-1', ownerId: 'user-1', ref: Q4 };
const ops: QuarterlyPlanOp[] = [{ op: 'addDirection', teamId: 'team-1', title: 'Checkout' }];
const preview = {
  content: {},
  dutyRiskAssignmentIds: [],
  issues: [],
  refs: {},
  status: 'preview' as const,
  targets: ['d1'],
  version: 3,
};

function storedDraft(proposalId = quarterlyPlanProposalId(ops)) {
  return { baseVersion: 3, createdAt: '2026-11-14T10:00:00.000Z', ops, proposalId, summary: 'addDirection×1' };
}

describe('quarterlyPlanDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applyQuarterlyPlanOps).mockResolvedValue(preview as never);
    vi.mocked(fetchQuarterlyPlanContent).mockResolvedValue({ content: {} as never, version: 5 });
  });

  it('предложение не пишет план: черновик ложится в квартал и сообщением в сессию (QM8)', async () => {
    vi.mocked(findQuarterlyPlanDraft).mockResolvedValue(null);
    const result = await proposeQuarterlyPlan({ ...owner, ifVersion: 3, intent: 'Перенести роадмэп', ops });
    expect(result).toMatchObject({ proposalId: quarterlyPlanProposalId(ops), sessionId: 'session-1', status: 'proposed' });
    expect(applyQuarterlyPlanOps).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true, ifVersion: 3 }));
    expect(prepareDraftAgentSession).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { kind: 'quarter', quarter: 4, year: 2026 } })
    );
    expect(saveQuarterlyPlanDraft).toHaveBeenCalledWith(expect.objectContaining({ baseVersion: 3, ops }));
    expect(recordDraftInAgentSession).toHaveBeenCalled();
  });

  it('другой непринятый черновик молча не заменяется (QM8)', async () => {
    vi.mocked(findQuarterlyPlanDraft).mockResolvedValue(storedDraft('other-draft'));
    const result = await proposeQuarterlyPlan({ ...owner, ifVersion: 3, ops });
    expect(result).toMatchObject({ error: expect.stringMatching(/^pending_proposal_exists/), status: 'invalid' });
    expect(saveQuarterlyPlanDraft).not.toHaveBeenCalled();
    await proposeQuarterlyPlan({ ...owner, ifVersion: 3, ops, replacePending: true });
    expect(saveQuarterlyPlanDraft).toHaveBeenCalled();
  });

  it('черновик показывается применённым к текущему плану (QM9)', async () => {
    vi.mocked(findQuarterlyPlanDraft).mockResolvedValue(storedDraft());
    const draft = await loadQuarterlyPlanDraft(owner);
    expect(draft).toMatchObject({ error: null, preview: { status: 'preview' } });
    expect(applyQuarterlyPlanOps).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true, ifVersion: 5 }));
  });

  it('принятие применяет пакет к текущему плану, а не к версии агента, и убирает черновик (QM10)', async () => {
    vi.mocked(findQuarterlyPlanDraft).mockResolvedValue(storedDraft());
    // Предпросмотр — на текущем плане (версия 5), запись — поверх него.
    vi.mocked(applyQuarterlyPlanOps)
      .mockResolvedValueOnce({ ...preview, version: 5 } as never)
      .mockResolvedValueOnce({ ...preview, status: 'saved', version: 6 } as never);
    await approveQuarterlyPlanDraft({ ...owner, proposalId: quarterlyPlanProposalId(ops) });
    expect(applyQuarterlyPlanOps).toHaveBeenLastCalledWith(expect.objectContaining({ dryRun: false, ifVersion: 5, ops }));
    expect(deleteQuarterlyPlanDraft).toHaveBeenCalled();
  });

  it('id новых сущностей черновика не меняются от опроса к опросу: пункт на доске остаётся тем же (QM10)', async () => {
    vi.mocked(findQuarterlyPlanDraft).mockResolvedValue(storedDraft());
    await loadQuarterlyPlanDraft(owner);
    await loadQuarterlyPlanDraft(owner);
    const [first, second] = vi.mocked(applyQuarterlyPlanOps).mock.calls.map(([input]) => input.newId?.(0));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).toBe(first);
  });

  describe('решение по пунктам (QM10)', () => {
    const packageOps: QuarterlyPlanOp[] = [
      { directionId: 'dir-1', op: 'addEpic', ref: '$e', title: 'Payments' },
      { epicId: '$e', memberId: 'alice', op: 'assign', span: { startWeek: 0, weeks: 2 } },
      { noteId: 'note-1', op: 'removeNote' },
    ];
    const packageId = quarterlyPlanProposalId(packageOps);
    const packagePreview = { ...preview, targets: ['epic-new', 'asg-new', 'note-1'] };

    beforeEach(() => {
      vi.mocked(findQuarterlyPlanDraft).mockResolvedValue({ ...storedDraft(packageId), ops: packageOps });
    });

    it('пункты черновика — по сущностям, что с ними делает черновик', async () => {
      vi.mocked(applyQuarterlyPlanOps).mockResolvedValue(packagePreview as never);
      await expect(loadQuarterlyPlanDraft(owner)).resolves.toMatchObject({
        items: [
          { change: 'added', id: 'epic-new', kind: 'epic' },
          { change: 'added', id: 'asg-new', kind: 'assignment' },
          { change: 'removed', id: 'note-1', kind: 'note' },
        ],
      });
    });

    it('принять назначение — с эпиком, без которого оно не применится; остальное остаётся черновиком той же версии', async () => {
      vi.mocked(applyQuarterlyPlanOps)
        .mockResolvedValueOnce(packagePreview as never)
        .mockResolvedValueOnce({ ...packagePreview, refs: { $e: 'epic-new' }, status: 'saved', version: 6 } as never)
        .mockResolvedValueOnce({ ...packagePreview, targets: ['note-1'] } as never);
      await approveQuarterlyPlanDraft({ ...owner, itemIds: ['asg-new'], proposalId: packageId });
      expect(applyQuarterlyPlanOps).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ dryRun: false, ops: packageOps.slice(0, 2) })
      );
      expect(saveQuarterlyPlanDraft).toHaveBeenCalledWith(
        expect.objectContaining({ baseVersion: 6, ops: [packageOps[2]], proposalId: packageId })
      );
      expect(deleteQuarterlyPlanDraft).not.toHaveBeenCalled();
    });

    it('отклонить эпик — вместе с назначением на него; последний пункт — черновик убирается', async () => {
      vi.mocked(applyQuarterlyPlanOps)
        .mockResolvedValueOnce(packagePreview as never)
        .mockResolvedValueOnce({ ...packagePreview, targets: ['note-1'] } as never);
      await expect(rejectQuarterlyPlanDraft({ ...owner, itemIds: ['epic-new'], proposalId: packageId })).resolves.toBe(true);
      expect(saveQuarterlyPlanDraft).toHaveBeenCalledWith(expect.objectContaining({ ops: [packageOps[2]] }));
      vi.mocked(findQuarterlyPlanDraft).mockResolvedValue({ ...storedDraft(packageId), ops: [packageOps[2]] });
      vi.mocked(applyQuarterlyPlanOps).mockResolvedValueOnce({ ...packagePreview, targets: ['note-1'] } as never);
      await rejectQuarterlyPlanDraft({ ...owner, itemIds: ['note-1'], proposalId: packageId });
      expect(deleteQuarterlyPlanDraft).toHaveBeenCalledWith(expect.objectContaining({ proposalId: packageId }));
    });
  });

  it('не применилось — черновик остаётся; устаревшая версия черновика не принимается', async () => {
    vi.mocked(findQuarterlyPlanDraft).mockResolvedValue(storedDraft());
    vi.mocked(applyQuarterlyPlanOps).mockResolvedValue({ error: 'removeEpic: unknown epic e1', opIndex: 0, status: 'invalid' });
    await expect(approveQuarterlyPlanDraft({ ...owner, proposalId: quarterlyPlanProposalId(ops) })).resolves.toMatchObject({
      status: 'invalid',
    });
    expect(deleteQuarterlyPlanDraft).not.toHaveBeenCalled();
    await expect(approveQuarterlyPlanDraft({ ...owner, proposalId: 'stale' })).resolves.toMatchObject({ status: 'invalid' });
  });
});
