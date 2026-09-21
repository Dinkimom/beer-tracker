'use client';

import {
  QuickAddMenuConvert,
  type QuickAddMenuConvertProps,
} from './QuickAddMenuConvert';
import {
  QuickAddMenuHosted,
  type QuickAddMenuHostedProps,
} from './QuickAddMenuHosted';

export type { QuickAddMenuIssueMode } from './QuickAddMenuTypes';

type QuickAddMenuProps =
  | (QuickAddMenuConvertProps & { variant?: 'convert' })
  | (QuickAddMenuHostedProps & { variant: 'hosted' });

/** Общее меню добавления: сайдбар / feature-lane (convert) и swimlane quick-add (hosted). */
export function QuickAddMenu(props: QuickAddMenuProps) {
  if (props.variant === 'hosted') {
    return <QuickAddMenuHosted {...props} />;
  }
  return <QuickAddMenuConvert {...props} />;
}
