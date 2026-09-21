import { NextResponse } from 'next/server';

import { readOnPremSetupState } from '@/lib/onPrem/setupState';
import { fetchFirstOrganizationId } from '@/lib/organizations';

/**
 * GET /api/onprem/default-organization — UUID первой организации продукта (для экрана входа по токену трекера).
 * После инициализации; без аутентификации.
 */
export async function GET() {
  const setup = await readOnPremSetupState();
  if (!setup.hasOrganizations) {
    return NextResponse.json({ error: 'Инициализация не завершена' }, { status: 404 });
  }
  const id = await fetchFirstOrganizationId();
  if (!id) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return NextResponse.json({ organizationId: id });
}
