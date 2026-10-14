import type {
  IssueLinkDirection,
  IssueTrackerCreateIssueLinkInput,
  IssueTrackerIssueLink,
} from './issueLinkTypes';
import type { AxiosInstance } from 'axios';

import {
  resolveStoredIssueLinkRelationship,
  yandexRelationshipForCreate,
} from './issueLinkTypes';

interface YandexLinkTypePayload {
  id?: string;
  inward?: string;
  outward?: string;
}

interface YandexLinkObjectPayload {
  display?: string;
  id?: string;
  key?: string;
}

interface YandexLinkStatusPayload {
  display?: string;
  key?: string;
}

interface YandexIssueLinkPayload {
  direction?: string;
  id?: number | string;
  object?: YandexLinkObjectPayload;
  status?: YandexLinkStatusPayload | string | null;
  type?: YandexLinkTypePayload;
}

function extractStatusDisplay(status: YandexIssueLinkPayload['status']): string | null {
  if (!status) {
    return null;
  }
  if (typeof status === 'string') {
    return status;
  }
  return status.display || status.key || null;
}

function resolveYandexRelationshipLabel(
  payload: YandexIssueLinkPayload
): string | null {
  const direction = payload.direction === 'inward' ? 'inward' : 'outward';
  const type = payload.type;
  if (!type) {
    return null;
  }
  const fromDirection = direction === 'inward' ? type.inward : type.outward;
  if (typeof fromDirection === 'string' && fromDirection.trim()) {
    return fromDirection;
  }
  if (typeof type.id === 'string' && type.id.trim()) {
    return type.id;
  }
  return null;
}

export function mapYandexIssueLinkPayload(
  payload: YandexIssueLinkPayload
): IssueTrackerIssueLink | null {
  const id = payload.id == null ? '' : String(payload.id);
  const linkedIssueKey = payload.object?.key?.trim() ?? '';
  if (!id || !linkedIssueKey) {
    return null;
  }

  const label = resolveYandexRelationshipLabel(payload);
  const stored = label ? resolveStoredIssueLinkRelationship(label) : null;
  if (!stored) {
    return null;
  }

  const direction: IssueLinkDirection =
    payload.direction === 'inward' ? 'inward' : 'outward';

  return {
    id,
    direction,
    relationship: stored.relationship,
    relationshipLabel: stored.relationshipLabel,
    linkedIssueKey,
    linkedSummary: payload.object?.display?.trim() || null,
    linkedStatus: extractStatusDisplay(payload.status),
  };
}

export function mapYandexIssueLinksPayload(
  payload: unknown
): IssueTrackerIssueLink[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const out: IssueTrackerIssueLink[] = [];
  for (const item of payload) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const mapped = mapYandexIssueLinkPayload(item as YandexIssueLinkPayload);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

export async function listYandexIssueLinks(
  api: AxiosInstance,
  issueKey: string
): Promise<IssueTrackerIssueLink[]> {
  const { data } = await api.get<unknown>(`/issues/${issueKey}/links`);
  return mapYandexIssueLinksPayload(data);
}

const YANDEX_LINK_BATCH_CONCURRENCY = 6;

/** У Трекера нет пакетного links API — те же GET, но пачками по 6. */
export async function listYandexIssueLinksBatch(
  api: AxiosInstance,
  issueKeys: string[]
): Promise<Record<string, IssueTrackerIssueLink[]>> {
  const out: Record<string, IssueTrackerIssueLink[]> = {};
  for (let offset = 0; offset < issueKeys.length; offset += YANDEX_LINK_BATCH_CONCURRENCY) {
    const chunk = issueKeys.slice(offset, offset + YANDEX_LINK_BATCH_CONCURRENCY);
    await Promise.all(
      chunk.map(async (issueKey) => {
        try {
          out[issueKey] = await listYandexIssueLinks(api, issueKey);
        } catch (error) {
          console.error(`Failed to list issue links for ${issueKey}:`, error);
          out[issueKey] = [];
        }
      })
    );
  }
  return out;
}

export async function createYandexIssueLink(
  api: AxiosInstance,
  issueKey: string,
  input: IssueTrackerCreateIssueLinkInput
): Promise<IssueTrackerIssueLink> {
  const { data } = await api.post<YandexIssueLinkPayload>(`/issues/${issueKey}/links`, {
    relationship: yandexRelationshipForCreate(input.relationship),
    issue: input.targetIssueKey.trim(),
  });
  const mapped = mapYandexIssueLinkPayload(data);
  if (mapped) {
    return mapped;
  }
  // Tracker иногда отдаёт урезанный ответ — собираем DTO из запроса.
  return {
    id: data?.id == null ? '' : String(data.id),
    direction: 'outward',
    relationship: input.relationship,
    relationshipLabel: input.relationship.replaceAll('_', ' '),
    linkedIssueKey: input.targetIssueKey.trim(),
    linkedSummary: data?.object?.display?.trim() || null,
    linkedStatus: extractStatusDisplay(data?.status),
  };
}

export async function deleteYandexIssueLink(
  api: AxiosInstance,
  issueKey: string,
  trackerLinkId: string
): Promise<void> {
  await api.delete(`/issues/${issueKey}/links/${trackerLinkId}`);
}
