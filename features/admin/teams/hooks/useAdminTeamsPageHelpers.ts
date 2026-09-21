import type { AdminTrackerCatalogPayload, AdminTrackerCatalogTeamBinding } from "@/features/admin/adminTeamCatalog";

import {
  validateNewTeamFormBindings,
  validateNewTeamFormFields,
} from "./useAdminTeamsPageFormValidationHelpers";

type Translate = (key: string, params?: Record<string, number | string>) => string;

export function parseTrackerCatalogPayload(
  data: AdminTrackerCatalogPayload & { error?: string },
): AdminTrackerCatalogPayload {
  return {
    boards: Array.isArray(data.boards) ? data.boards : [],
    queues: Array.isArray(data.queues) ? data.queues : [],
    teams: Array.isArray(data.teams) ? data.teams : [],
  };
}

interface NewTeamFormValidation {
  boardNum: number;
  queue: string;
  title: string;
}

export function validateNewTeamForm(
  input: {
    boardRaw: string;
    bindings: AdminTrackerCatalogTeamBinding[];
    queue: string;
    title: string;
  },
  t: Translate,
): { error: string; ok: false } | { error?: string; ok: true; value: NewTeamFormValidation } {
  const fields = validateNewTeamFormFields(input, t);
  if (!fields.ok) {
    return fields;
  }
  const bindings = validateNewTeamFormBindings(
    input.bindings,
    input.boardRaw.trim(),
    t,
  );
  if (!bindings.ok) {
    return bindings;
  }
  return { ok: true, value: { title: fields.title, queue: fields.queue, boardNum: bindings.boardNum } };
}
