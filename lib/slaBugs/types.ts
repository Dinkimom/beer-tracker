import type { Task } from '@/types';

export type SlaPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type SlaBugSection = 'regular' | 'review' | 'take_now' | 'watch';

export type SlaBugDemoteReason = 'low_relevance' | 'stale_p3';

export type SlaBugLabelKey =
  'close_p4' | 'close_to_upgrade' | 'demote' | 'growth_24h' | 'hd_high' | 'hd_low' | 'hd_medium' | 'key_client' | 'no_growth' | 'no_signal' | 'save_sla' | 'sharp_growth' | 'sup_priority';

export interface SlaBugInput {
  createdAt?: string;
  hdCount: number;
  hdGrowth7d: number;
  hdGrowth24h: number;
  id: string;
  inActiveWork: boolean;
  keyClient: boolean;
  lastHdAt?: string;
  priority: SlaPriority;
  slaDeadline?: string;
  supPriority: boolean;
  updatedAt?: string;
}

export interface ClassifiedSlaBug {
  applicableLabels: SlaBugLabelKey[];
  demoteReason?: SlaBugDemoteReason;
  input: SlaBugInput;
  primaryLabel: SlaBugLabelKey | null;
  section: SlaBugSection;
  sortMeta: SlaBugSortMeta;
  task: Task;
}

export interface SlaBugSortMeta {
  closeToUpgrade: boolean;
  daysToSla: number | null;
  hasFreshGrowth7d: boolean;
  hdCount: number;
  isLongOverdue: boolean;
  isOverdue: boolean;
  overdueDays: number;
  priorityRank: number;
  sharpGrowth24h: boolean;
  strongGrowth7d: boolean;
  supPriority: boolean;
}

export interface SlaBugsBySection {
  regular: ClassifiedSlaBug[];
  review: ClassifiedSlaBug[];
  take_now: ClassifiedSlaBug[];
  watch: ClassifiedSlaBug[];
}
