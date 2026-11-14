import type { QuarterlyPlanOp } from './quarterlyPlanOps';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareDraftAgentSession, recordDraftInAgentSession } from '@/lib/agentSessions/agentSessionService';

import {
  approveQuarterlyPlanDraft,
  loadQuarterlyPlanDraft,
  proposeQuarterlyPlan,
  quarterlyPlanProposalId,
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
    vi.mocked(applyQuarterlyPlanOps).mockResolvedValue({ ...preview, status: 'saved', version: 6 } as never);
    await approveQuarterlyPlanDraft({ ...owner, proposalId: quarterlyPlanProposalId(ops) });
    expect(applyQuarterlyPlanOps).toHaveBeenCalledWith(expect.objectContaining({ dryRun: false, ifVersion: 5, ops }));
    expect(deleteQuarterlyPlanDraft).toHaveBeenCalled();
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
