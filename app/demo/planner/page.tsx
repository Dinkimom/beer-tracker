import { getDemoPlannerPublicConfig } from '@/lib/demo/demoPlannerConfig';

import DemoPlannerClient from './DemoPlannerClient';

/** Fixture demo must not be statically prerendered without the client override. */
export const dynamic = 'force-dynamic';

export default function DemoPlannerPage() {
  const cfg = getDemoPlannerPublicConfig();
  return (
    <DemoPlannerClient boardId={cfg.boardId} productOrganizationId={cfg.productOrganizationId} />
  );
}
