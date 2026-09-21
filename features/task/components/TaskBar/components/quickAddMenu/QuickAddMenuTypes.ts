import type { QuickAddMode } from './types';

export type QuickAddMenuIssueMode = Extract<QuickAddMode, 'draft' | 'existing' | 'new'>;
