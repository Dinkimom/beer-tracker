/**
 * Черновики агента для квартального плана (раздел 11 QUARTERLY_PLAN_RULES.md, QM8–QM11): агент предлагает пакет
 * операций, человек принимает или отклоняет его на доске — целиком или по пунктам. Агент план сам не пишет.
 */

import type { QuarterlyPlanOp } from './quarterlyPlanOps';
import type { QuarterRef } from './quarterlyPlanTypes';
import type { AgentSessionReply } from '@/lib/agentSessions/agentSession';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { createHash } from 'crypto';

import { quarterScope } from '@/lib/agentSessions/agentSessionScope';
import { prepareDraftAgentSession, recordDraftInAgentSession } from '@/lib/agentSessions/agentSessionService';

import {
  quarterlyPlanDraftItems,
  resolveQuarterlyPlanDraftRefs,
  selectQuarterlyPlanDraftOps,
} from './quarterlyPlanDraftItems';
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

/**
 * id новых сущностей черновика: от версии и самой операции, а не случайные. Доска опрашивает черновик,
 * и пункт должен остаться тем же пунктом (QM10); принятый пункт ложится в план с тем же id, что был на доске.
 */
function draftEntityIds(proposalId: string, ops: readonly QuarterlyPlanOp[]): string[] {
  const seen = new Map<string, number>();
  return ops.map((op) => {
    const key = JSON.stringify(op);
    const nth = seen.get(key) ?? 0;
    seen.set(key, nth + 1);
    const hex = createHash('sha256').update(`${proposalId}|${key}|${nth}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  });
}

/** Пакет черновика заново против текущего плана, без записи: что получится, если принять сейчас. */
async function previewOnCurrentPlan(owner: DraftOwner, proposalId: string, ops: readonly QuarterlyPlanOp[]) {
  const { version } = await fetchQuarterlyPlanContent(owner.organizationId, owner.ref);
  const ids = draftEntityIds(proposalId, ops);
  return applyQuarterlyPlanOps({
    dryRun: true,
    ifVersion: version,
    newId: (index) => ids[index] ?? crypto.randomUUID(),
    ops,
    organizationId: owner.organizationId,
    ref: owner.ref,
  });
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
 * агент видит его в `get_quarterly_plan`. `items` — пункты, которые решают по одному (QM10). null — черновика нет.
 */
export async function loadQuarterlyPlanDraft(owner: DraftOwner) {
  const draft = await findQuarterlyPlanDraft(owner);
  if (!draft) return null;
  const ops = QuarterlyPlanOpsSchema.safeParse(draft.ops);
  const base = { baseVersion: draft.baseVersion, createdAt: draft.createdAt, proposalId: draft.proposalId, summary: draft.summary };
  if (!ops.success) return { ...base, error: 'the draft is unreadable; reject it', items: [], preview: null };
  const preview = await previewOnCurrentPlan(owner, draft.proposalId, ops.data);
  if (preview.status !== 'preview') {
    return { ...base, error: preview.status === 'invalid' ? preview.error : 'conflict', items: [], preview: null };
  }
  return { ...base, error: null, items: quarterlyPlanDraftItems(ops.data, preview.targets), preview };
}

type StoredDraft = NonNullable<Awaited<ReturnType<typeof findQuarterlyPlanDraft>>>;

/**
 * Что осталось от черновика после решения о части пунктов (QM10). Версия черновика та же — он остаётся в своей
 * сессии агента. Не осталось ни одного пункта на доске — черновик убирается.
 */
async function keepRestOfDraft(owner: DraftOwner, draft: StoredDraft, rest: QuarterlyPlanOp[], baseVersion: number) {
  const preview = rest.length > 0 ? await previewOnCurrentPlan(owner, draft.proposalId, rest) : null;
  const visible = preview?.status !== 'preview' || quarterlyPlanDraftItems(rest, preview.targets).length > 0;
  if (rest.length === 0 || !visible) {
    await deleteQuarterlyPlanDraft({ ...owner, proposalId: draft.proposalId });
    return;
  }
  await saveQuarterlyPlanDraft({
    ...owner,
    baseVersion,
    ops: rest,
    proposalId: draft.proposalId,
    summary: summarizeQuarterlyPlanOps(rest),
  });
}

/** Черновик той версии, о которой решает человек; иначе ошибка. */
async function readDraftForDecision(owner: DraftOwner & { proposalId?: string }) {
  const draft = await findQuarterlyPlanDraft(owner);
  if (!draft || (owner.proposalId && draft.proposalId !== owner.proposalId)) {
    return { error: 'the draft has changed or is gone; reload the plan', status: 'invalid' as const };
  }
  const ops = QuarterlyPlanOpsSchema.safeParse(draft.ops);
  if (!ops.success) return { error: 'the draft is unreadable; reject it', status: 'invalid' as const };
  return { draft, ops: ops.data, status: 'ok' as const };
}

/**
 * Человек принимает черновик целиком или пункты `itemIds` (QM10): операции применяются к текущему плану,
 * а не к той версии, от которой агент считал, — правки, сделанные после предложения, не теряются. Пункт тянет
 * за собой то, без чего не применится. Остальное остаётся черновиком. Не применилось — черновик как был.
 */
export async function approveQuarterlyPlanDraft(owner: DraftOwner & { itemIds?: readonly string[]; proposalId: string }) {
  const read = await readDraftForDecision(owner);
  if (read.status !== 'ok') return read;
  const { draft, ops } = read;
  const ids = draftEntityIds(draft.proposalId, ops);
  const preview = await previewOnCurrentPlan(owner, draft.proposalId, ops);
  if (preview.status !== 'preview') return preview;
  const selected = owner.itemIds
    ? selectQuarterlyPlanDraftOps({ itemIds: owner.itemIds, mode: 'approve', ops, targets: preview.targets })
    : new Set(ops.keys());
  const picked = [...selected].sort((a, b) => a - b);
  if (picked.length === 0) return { error: 'no such items in the draft; reload the plan', status: 'invalid' as const };
  const result = await applyQuarterlyPlanOps({
    dryRun: false,
    ifVersion: preview.version,
    newId: (index) => ids[picked[index] ?? -1] ?? crypto.randomUUID(),
    ops: picked.flatMap((index) => ops[index] ?? []),
    organizationId: owner.organizationId,
    ref: owner.ref,
  });
  if (result.status !== 'saved') return result;
  const rest = resolveQuarterlyPlanDraftRefs(
    ops.filter((_, index) => !selected.has(index)),
    result.refs
  );
  await keepRestOfDraft(owner, draft, rest, result.version);
  return result;
}

/** Человек отклоняет черновик целиком или пункты `itemIds` с тем, что без них не применится (QM10): план не меняется. */
export async function rejectQuarterlyPlanDraft(
  owner: DraftOwner & { itemIds?: readonly string[]; proposalId?: string }
): Promise<boolean> {
  if (!owner.itemIds) return deleteQuarterlyPlanDraft(owner);
  const read = await readDraftForDecision(owner);
  if (read.status !== 'ok') return false;
  const { draft, ops } = read;
  const preview = await previewOnCurrentPlan(owner, draft.proposalId, ops);
  if (preview.status !== 'preview') return false;
  const selected = selectQuarterlyPlanDraftOps({ itemIds: owner.itemIds, mode: 'reject', ops, targets: preview.targets });
  await keepRestOfDraft(owner, draft, ops.filter((_, index) => !selected.has(index)), draft.baseVersion);
  return true;
}
