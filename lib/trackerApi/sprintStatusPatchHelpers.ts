import type { SprintInfo } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { isAxiosError } from 'axios';

type SprintPayloadWithBoard = SprintInfo & { board?: { id?: number | string } };

async function patchSprintStatusWithVersion(
  api: AxiosInstance,
  sprintId: number,
  status: SprintPayloadWithBoard['status'],
  version?: number
): Promise<SprintPayloadWithBoard> {
  const headers: Record<string, string> = {};
  if (version !== undefined) {
    headers['If-Match'] = `"${version}"`;
  }
  const { data } = await api.patch<SprintPayloadWithBoard>(`/sprints/${sprintId}`, { status }, { headers });
  return data;
}

export async function patchSprintStatusHandlingPrecondition(
  api: AxiosInstance,
  sprintId: number,
  status: SprintPayloadWithBoard['status'],
  version?: number
): Promise<SprintPayloadWithBoard> {
  try {
    return await patchSprintStatusWithVersion(api, sprintId, status, version);
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 412 || version === undefined) {
      throw error;
    }
    const currentSprint = await api.get<SprintPayloadWithBoard>(`/sprints/${sprintId}`).then((r) => r.data);
    return currentSprint.status === status
      ? currentSprint
      : patchSprintStatusWithVersion(api, sprintId, status, currentSprint.version);
  }
}
