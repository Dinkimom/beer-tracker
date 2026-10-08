import type {
  IssueLinkDirection,
  IssueTrackerCreateIssueLinkInput,
  IssueTrackerIssueLink,
} from './issueLinkTypes';
import type { AxiosInstance } from 'axios';

import {
  mapTrackerRelationshipLabelToCanonical,
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
  if (!label) {
    return null;
  }
  const relationship = mapTrackerRelationshipLabelToCanonical(label);
  if (!relationship) {
    return null;
  }

  const direction: IssueLinkDirection =
    payload.direction === 'inward' ? 'inward' : 'outward';

  return {
    id,
    direction,
    relationship,
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
