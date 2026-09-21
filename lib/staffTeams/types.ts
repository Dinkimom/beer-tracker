/**
 * Строки таблиц staff, teams, team_members (в разрезе organization_id).
 */

export interface StaffRow {
  avatar_url: string | null;
  created_at: Date;
  display_name: string;
  email: string | null;
  id: string;
  manual_override_flags: Record<string, unknown> | null;
  organization_id: string;
  tracker_user_id: string | null;
  updated_at: Date;
}

export interface TeamRow {
  active: boolean;
  created_at: Date;
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  /** DB: `tracker_board_id` — id доски issue tracker provider. */
  tracker_board_id: string;
  /** DB: `tracker_queue_key` — ключ очереди issue tracker provider. */
  tracker_queue_key: string;
  updated_at: Date;
}

export interface TeamMemberRow {
  role_slug: string | null;
  staff_id: string;
  team_id: string;
}

export interface TeamMemberWithStaffRow extends TeamMemberRow {
  pending_product_invitation: boolean;
  product_planner_is_team_lead: boolean | null;
  product_team_access: boolean;
  product_user_id: string | null;
  product_user_in_org: boolean;
  staff_avatar_url: string | null;
  staff_display_name: string;
  staff_email: string | null;
  staff_tracker_user_id: string | null;
}
