import type { PoolClient } from 'pg';

import { NextResponse } from 'next/server';

import { allocateUniqueOrganizationSlug } from '@/lib/auth/orgSlug';
import { pool, qualifyBeerTrackerTables } from '@/lib/db';
import { getIssueTrackerProviderKind } from '@/lib/env';
import { mergeOrganizationSettingsIssueTrackerPatch } from '@/lib/issueTrackerProvider/settings';
import { buildDefaultTrackerIntegrationStored, mergeOrganizationSettingsTrackerIntegration } from '@/lib/trackerIntegration';

import { ensureAdminsTable } from './adminsRepository';
import { appendProductSessionCookie } from './cookies';

interface OnPremFirstUserInsertInput {
  displayName: string;
  email: string;
  encryptedTrackerToken: Buffer;
  orgName: string;
  settings: ReturnType<typeof mergeOrganizationSettingsTrackerIntegration>;
  slug: string;
  trackerOrgId: string;
  trackerUserId: string | null;
}

interface RegisterOnPremFirstUserInput {
  displayName: string;
  email: string;
  encryptedTrackerToken: Buffer;
  jiraBasicAuthEmail?: string;
  orgName: string;
  trackerOrgId: string;
  trackerUserId: string | null;
}

function registerOnPremInitConflictResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        'Инициализация уже выполнена. Войдите или попросите администратора добавить вас в команду.',
    },
    { status: 409 }
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

function isOnPremAlreadyInitialized(err: unknown): boolean {
  return err instanceof Error && err.message === 'ONPREM_ALREADY_INITIALIZED';
}

async function assertOnPremDatabaseEmpty(client: PoolClient) {
  const stateResult = await client.query<{ has_admins: boolean; has_organizations: boolean }>(
    qualifyBeerTrackerTables(
      `SELECT
         EXISTS(SELECT 1 FROM organizations) AS has_organizations,
         EXISTS(SELECT 1 FROM admins) AS has_admins`
    )
  );
  const state = stateResult.rows[0];
  if (state?.has_organizations || state?.has_admins) {
    throw new Error('ONPREM_ALREADY_INITIALIZED');
  }
}

async function insertOnPremStaffAndAdmin(
  client: PoolClient,
  input: OnPremFirstUserInsertInput,
  organizationId: string
): Promise<string> {
  const staffResult = await client.query<{ id: string }>(
    qualifyBeerTrackerTables(
      `INSERT INTO staff (organization_id, display_name, email, tracker_user_id)
       VALUES ($1::uuid, $2, $3, $4)
       RETURNING id::text AS id`
    ),
    [organizationId, input.displayName, input.email, input.trackerUserId]
  );
  const staffUid = staffResult.rows[0]?.id;
  if (!staffUid) {
    throw new Error('register/onprem: no staff row returned');
  }

  await client.query(qualifyBeerTrackerTables(`INSERT INTO admins (staff_uid) VALUES ($1::uuid)`), [
    staffUid,
  ]);
  await client.query(
    qualifyBeerTrackerTables(
      `INSERT INTO organization_secrets (organization_id, encrypted_tracker_token, encryption_key_version)
       VALUES ($1::uuid, $2, 1)`
    ),
    [organizationId, input.encryptedTrackerToken]
  );
  return staffUid;
}

async function insertOnPremOrgAndAdmin(
  client: PoolClient,
  input: OnPremFirstUserInsertInput
) {
  const orgResult = await client.query<{ id: string }>(
    qualifyBeerTrackerTables(
      `INSERT INTO organizations (name, slug, tracker_org_id, settings)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id`
    ),
    [input.orgName, input.slug, input.trackerOrgId, JSON.stringify(input.settings)]
  );
  const organizationId = orgResult.rows[0]?.id;
  if (!organizationId) {
    throw new Error('register/onprem: no organization row returned');
  }

  const staffUid = await insertOnPremStaffAndAdmin(client, input, organizationId);
  return { organizationId, staffUid };
}

async function runOnPremFirstUserTransaction(input: RegisterOnPremFirstUserInput) {
  await ensureAdminsTable();
  const slug = await allocateUniqueOrganizationSlug(input.orgName);
  let settings: Record<string, unknown> = mergeOrganizationSettingsTrackerIntegration(
    {},
    buildDefaultTrackerIntegrationStored(0)
  );
  settings = mergeOrganizationSettingsIssueTrackerPatch(settings, {
    basicAuthEmail: input.jiraBasicAuthEmail,
    provider: getIssueTrackerProviderKind(),
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(742001)');
    await assertOnPremDatabaseEmpty(client);
    const { organizationId, staffUid } = await insertOnPremOrgAndAdmin(client, {
      ...input,
      settings,
      slug,
    });
    await client.query('COMMIT');
    const res = NextResponse.json({
      organization: { id: organizationId, name: input.orgName, slug },
      user: {
        email: input.email,
        emailVerified: true,
        id: staffUid,
      },
    });
    appendProductSessionCookie(res, staffUid);
    return res;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function mapOnPremFirstUserError(err: unknown): NextResponse {
  if (isOnPremAlreadyInitialized(err) || isUniqueViolation(err)) {
    return registerOnPremInitConflictResponse();
  }
  console.error('[auth/register:onprem]', err);
  return NextResponse.json({ error: 'Не удалось завершить первичную настройку' }, { status: 500 });
}

export async function registerOnPremFirstUser(
  input: RegisterOnPremFirstUserInput
): Promise<NextResponse> {
  if (!input.email) {
    return NextResponse.json({ error: 'Укажите email' }, { status: 422 });
  }

  try {
    return await runOnPremFirstUserTransaction(input);
  } catch (err) {
    return mapOnPremFirstUserError(err);
  }
}
