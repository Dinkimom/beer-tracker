/**
 * Черновики агента для квартального плана (раздел 11 QUARTERLY_PLAN_RULES.md, QM8–QM11): агент предлагает пакет
 * операций, человек принимает или отклоняет его целиком на доске. Агент план сам не пишет.
 */

import type { QuarterlyPlanOp } from './quarterlyPlanOps';
import type { QuarterRef } from './quarterlyPlanTypes';
import type { AgentSessionReply } from '@/lib/agentSessions/agentSession';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { createHash } from 'crypto';

import { quarterScope } from '@/lib/agentSessions/agentSessionScope';
import { prepareDraftAgentSession, recordDraftInAgentSession } from '@/lib/agentSessions/agentSessionService';

import {
  deleteQuarterlyPlanDraft,
  findQuarterlyPlanDraft,
  saveQuarterlyPlanDraft,
} from './quarterlyPlanDraftsRepository';
import { QuarterlyPlanOpsSchema } from './quarterlyPlanOps';
import { applyQuarterlyPlanOps } from './quarterlyPlanService';
import { fetchQuarterlyPlanContent } from './quarterlyPlansRepository';

interface DraftOwner {
  organizationId: string;
  ownerId: string;
  ref: QuarterRef;
}

/** Версия черновика: одинаковый пакет — та же версия, повторное предложение ничего не меняет. */
export function quarterlyPlanProposalId(ops: readonly QuarterlyPlanOp[]): string {
  return createHash('sha256').update(JSON.stringify(ops)).digest('hex').slice(0, 12);
}

/** Сводка пакета для сессии, если агент не написал своё: `addEpic×12, assign×6`. */
function summarizeQuarterlyPlanOps(ops: readonly QuarterlyPlanOp[]): string {
  const counts = new Map<string, number>();
  for (const op of ops) counts.set(op.op, (counts.get(op.op) ?? 0) + 1);
  return [...counts].map(([op, count]) => `${op}×${count}`).join(', ');
}

/** Пакет черновика заново против текущего плана, без записи: что получится, если принять сейчас. */
async function previewOnCurrentPlan(owner: DraftOwner, ops: readonly QuarterlyPlanOp[]) {
  const { version } = await fetchQuarterlyPlanContent(owner.organizationId, owner.ref);
  return applyQuarterlyPlanOps({ dryRun: true, ifVersion: version, ops, organizationId: owner.organizationId, ref: owner.ref });
}

/**
 * Агент предлагает пакет (QM8). Пакет проверяется, как при записи, но в план не пишется: ложится черновиком
 * владельца в квартале и сообщением `draft` в его сессию. Другой непринятый черновик молча не заменяется —
 * нужен `replacePending` (как `propose_plan_patch` спринта).
 */
export async function proposeQuarterlyPlan(
  input: DraftOwner & {
    clientBrand?: McpOAuthClientBrand;
    draftMessage?: string;
    ifVersion: number;
    intent?: string;
    ops: readonly QuarterlyPlanOp[];
    replacePending?: boolean;
    replies?: readonly AgentSessionReply[];
    sessionId?: string;
  }
) {
  const preview = await applyQuarterlyPlanOps({
    dryRun: true,
    ifVersion: input.ifVersion,
    ops: input.ops,
    organizationId: input.organizationId,
    ref: input.ref,
  });
  if (preview.status !== 'preview') return preview;
  const proposalId = quarterlyPlanProposalId(input.ops);
  const pending = await findQuarterlyPlanDraft(input);
  if (pending && pending.proposalId !== proposalId && !input.replacePending) {
    return {
      error: `pending_proposal_exists: the quarterly board has an unreviewed draft ${pending.proposalId}; pass replacePending: true to replace it`,
      status: 'invalid' as const,
    };
  }
  const summary = summarizeQuarterlyPlanOps(input.ops);
  const session = await prepareDraftAgentSession({
    intent: input.intent,
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    scope: quarterScope(input.ref),
    sessionId: input.sessionId,
    summaryFallback: input.intent ?? summary,
  });
  await saveQuarterlyPlanDraft({ ...input, baseVersion: input.ifVersion, ops: input.ops, proposalId, summary });
  const recorded = await recordDraftInAgentSession({
    clientBrand: input.clientBrand,
    message: input.draftMessage,
    organizationId: input.organizationId,
    proposalId,
    replies: input.replies ?? [],
    session,
    summary,
  });
  return {
    ...recorded,
    dutyRiskAssignmentIds: preview.dutyRiskAssignmentIds,
    issues: preview.issues,
    proposalId,
    status: 'proposed' as const,
    summary,
  };
}

/**
 * Черновик человека в квартале, применённый к текущему плану без записи (QM9): доска рисует результат,
 * агент видит его в `get_quarterly_plan`. null — черновика нет.
 */
export async function loadQuarterlyPlanDraft(owner: DraftOwner) {
  const draft = await findQuarterlyPlanDraft(owner);
  if (!draft) return null;
  const ops = QuarterlyPlanOpsSchema.safeParse(draft.ops);
  if (!ops.success) return { ...draft, error: 'the draft is unreadable; reject it', preview: null };
  const preview = await previewOnCurrentPlan(owner, ops.data);
  return {
    baseVersion: draft.baseVersion,
    createdAt: draft.createdAt,
    ...(preview.status === 'preview' ? { error: null, preview } : { error: preview.status === 'invalid' ? preview.error : 'conflict', preview: null }),
    proposalId: draft.proposalId,
    summary: draft.summary,
  };
}

/**
 * Человек принимает черновик целиком (QM10): операции применяются к текущему плану, а не к той версии,
 * от которой агент считал, — правки, сделанные после предложения, не теряются. Не применилось — черновик остаётся.
 */
export async function approveQuarterlyPlanDraft(owner: DraftOwner & { proposalId: string }) {
  const draft = await findQuarterlyPlanDraft(owner);
  if (!draft || draft.proposalId !== owner.proposalId) {
    return { error: 'the draft has changed or is gone; reload the plan', status: 'invalid' as const };
  }
  const ops = QuarterlyPlanOpsSchema.safeParse(draft.ops);
  if (!ops.success) return { error: 'the draft is unreadable; reject it', status: 'invalid' as const };
  const { version } = await fetchQuarterlyPlanContent(owner.organizationId, owner.ref);
  const result = await applyQuarterlyPlanOps({
    dryRun: false,
    ifVersion: version,
    ops: ops.data,
    organizationId: owner.organizationId,
    ref: owner.ref,
  });
  if (result.status === 'saved') await deleteQuarterlyPlanDraft(owner);
  return result;
}

/** Человек отклоняет черновик (QM10): план не меняется. */
export function rejectQuarterlyPlanDraft(owner: DraftOwner & { proposalId?: string }): Promise<boolean> {
  return deleteQuarterlyPlanDraft(owner);
}
