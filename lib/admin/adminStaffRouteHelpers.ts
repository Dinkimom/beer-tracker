import type { UpdateStaffPatch } from '@/lib/staffTeams/staffRepository';
import type { StaffRow } from '@/lib/staffTeams/types';

import { NextResponse } from 'next/server';
import { DatabaseError } from 'pg';
import { z } from 'zod';

import { deleteAdmin, isStaffAdmin } from '@/lib/auth/adminsRepository';
import {
  countAdminsInOrganization,
  deleteStaff,
  findStaffById,
  findStaffByOrganizationAndEmailNorm,
  findStaffByOrganizationAndTrackerUserId,
  insertStaff,
  syncStaffTeamMemberships,
  updateStaff,
} from '@/lib/staffTeams';

interface AdminStaffWriteInput {
  avatar_url?: string | null;
  display_name: string;
  email: string | null;
  team_ids?: string[];
  tracker_user_id: string | null;
}

async function applyStaffTeamIdsIfPresent(
  orgId: string,
  staffId: string,
  teamIds: string[] | undefined
): Promise<NextResponse | null> {
  if (teamIds === undefined) {
    return null;
  }
  const synced = await syncStaffTeamMemberships(orgId, staffId, teamIds);
  if ('error' in synced) {
    return NextResponse.json({ error: synced.error }, { status: synced.status });
  }
  return null;
}

export const optionalStaffEmailSchema = z.string().max(320).optional().nullable();
export const optionalStaffTrackerIdSchema = z.string().max(256).optional().nullable();
export const optionalStaffAvatarUrlSchema = z.string().max(2048).optional().nullable();

export function normalizeOptionalStaffText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeStaffEmail(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalStaffText(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

export function staffEmailFromInput(raw: string | null | undefined): NextResponse | string | null {
  const email = normalizeStaffEmail(raw);
  if (email && !z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
  }
  return email;
}

function uniqueConstraintResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Сотрудник с таким email или идентификатором в трекере уже есть' },
    { status: 409 }
  );
}

async function emailTakenByOther(
  orgId: string,
  email: string | null,
  exceptStaffId?: string
): Promise<boolean> {
  if (!email) {
    return false;
  }
  const existing = await findStaffByOrganizationAndEmailNorm(orgId, email);
  return Boolean(existing && existing.id !== exceptStaffId);
}

async function trackerIdTakenByOther(
  orgId: string,
  trackerUserId: string | null,
  exceptStaffId?: string
): Promise<boolean> {
  if (!trackerUserId) {
    return false;
  }
  const existing = await findStaffByOrganizationAndTrackerUserId(orgId, trackerUserId);
  return Boolean(existing && existing.id !== exceptStaffId);
}

async function denyDuplicateIdentity(
  orgId: string,
  email: string | null,
  trackerUserId: string | null,
  exceptStaffId?: string
): Promise<NextResponse | null> {
  if (await emailTakenByOther(orgId, email, exceptStaffId)) {
    return uniqueConstraintResponse();
  }
  if (await trackerIdTakenByOther(orgId, trackerUserId, exceptStaffId)) {
    return uniqueConstraintResponse();
  }
  return null;
}

async function denyLastAdmin(orgId: string, staffId: string): Promise<NextResponse | null> {
  if (!(await isStaffAdmin(staffId))) {
    return null;
  }
  const admins = await countAdminsInOrganization(orgId);
  if (admins <= 1) {
    return NextResponse.json(
      { error: 'Нельзя удалить последнего администратора организации' },
      { status: 400 }
    );
  }
  return null;
}

function catchUniqueViolation(err: unknown): NextResponse | null {
  if (err instanceof DatabaseError && err.code === '23505') {
    return uniqueConstraintResponse();
  }
  return null;
}

export async function createStaffFromAdminPost(
  orgId: string,
  input: AdminStaffWriteInput
): Promise<NextResponse> {
  const duplicate = await denyDuplicateIdentity(orgId, input.email, input.tracker_user_id);
  if (duplicate) {
    return duplicate;
  }
  try {
    const staff = await insertStaff(orgId, {
      avatar_url: input.avatar_url,
      display_name: input.display_name,
      email: input.email,
      tracker_user_id: input.tracker_user_id,
    });
    const teamsError = await applyStaffTeamIdsIfPresent(orgId, staff.id, input.team_ids);
    if (teamsError) {
      return teamsError;
    }
    return NextResponse.json({ staff }, { status: 201 });
  } catch (err) {
    const conflict = catchUniqueViolation(err);
    if (conflict) {
      return conflict;
    }
    throw err;
  }
}

function nextStaffIdentity(
  current: StaffRow,
  write?: Partial<AdminStaffWriteInput>
): { email: string | null; tracker_user_id: string | null } {
  return {
    email: write && 'email' in write ? (write.email ?? null) : current.email,
    tracker_user_id:
      write && 'tracker_user_id' in write ? (write.tracker_user_id ?? null) : current.tracker_user_id,
  };
}

export async function patchStaffFromAdmin(input: {
  orgId: string;
  staffId: string;
  teamIds?: string[];
  write: UpdateStaffPatch;
}): Promise<NextResponse> {
  const current = await findStaffById(input.orgId, input.staffId);
  if (!current) {
    return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
  }

  const hasIdentityPatch = Object.keys(input.write).length > 0;
  if (hasIdentityPatch) {
    const identity = nextStaffIdentity(current, input.write);
    const duplicate = await denyDuplicateIdentity(
      input.orgId,
      identity.email,
      identity.tracker_user_id,
      input.staffId
    );
    if (duplicate) {
      return duplicate;
    }
  }

  try {
    const staff = hasIdentityPatch
      ? await updateStaff(input.orgId, input.staffId, input.write)
      : current;
    if (!staff) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }
    const teamsError = await applyStaffTeamIdsIfPresent(input.orgId, input.staffId, input.teamIds);
    if (teamsError) {
      return teamsError;
    }
    return NextResponse.json({ staff });
  } catch (err) {
    const conflict = catchUniqueViolation(err);
    if (conflict) {
      return conflict;
    }
    throw err;
  }
}

export async function deleteStaffFromAdmin(input: {
  orgId: string;
  requesterUserId: string;
  staffId: string;
}): Promise<NextResponse> {
  const current = await findStaffById(input.orgId, input.staffId);
  if (!current) {
    return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
  }
  if (input.requesterUserId === input.staffId) {
    return NextResponse.json({ error: 'Нельзя удалить свою учётную запись' }, { status: 403 });
  }
  const lastAdminDenied = await denyLastAdmin(input.orgId, input.staffId);
  if (lastAdminDenied) {
    return lastAdminDenied;
  }

  await deleteAdmin(input.staffId);
  const ok = await deleteStaff(input.orgId, input.staffId);
  if (!ok) {
    return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
