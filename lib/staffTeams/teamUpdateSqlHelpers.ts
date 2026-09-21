interface UpdateTeamPatch {
  active?: boolean;
  slug?: string;
  title?: string;
  tracker_board_id?: number | string;
  tracker_queue_key?: string;
}

type QueryParams = Array<boolean | number | string | null>;

function appendTeamUpdateAssignment(
  assignments: string[],
  values: QueryParams,
  col: keyof UpdateTeamPatch,
  value: UpdateTeamPatch[keyof UpdateTeamPatch],
  paramIndex: number
): number {
  if (col === 'tracker_board_id') {
    assignments.push(`tracker_board_id = $${paramIndex}::bigint`);
    values.push(String(value));
    return paramIndex + 1;
  }
  assignments.push(`${String(col)} = $${paramIndex}`);
  values.push(value as QueryParams[number]);
  return paramIndex + 1;
}

export function buildTeamUpdateAssignments(
  patch: UpdateTeamPatch,
  columns: (keyof UpdateTeamPatch)[]
): { assignments: string[]; values: QueryParams } {
  const assignments: string[] = [];
  const values: QueryParams = [];
  let paramIndex = 3;
  for (const col of columns) {
    if (patch[col] === undefined) {
      continue;
    }
    paramIndex = appendTeamUpdateAssignment(assignments, values, col, patch[col], paramIndex);
  }
  return { assignments, values };
}
