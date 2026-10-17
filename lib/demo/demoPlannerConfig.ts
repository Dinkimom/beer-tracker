import { DEMO_BOARD_ID, DEMO_ORG_ID } from './demoIds';

/** Always-on fixture config for `/demo/planner` (no DEMO_* env required). */
export function getDemoPlannerPublicConfig(): {
  boardId: number;
  productOrganizationId: string;
} {
  return {
    boardId: DEMO_BOARD_ID,
    productOrganizationId: DEMO_ORG_ID,
  };
}
