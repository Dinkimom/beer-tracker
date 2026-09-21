'use client';

import type { AdminInlineAlertVariant } from './AdminInlineAlert.types';
import type { ReactNode } from 'react';

import { AdminInlineAlertIcon } from './AdminInlineAlertIcon';

const containerClass: Record<AdminInlineAlertVariant, string> = {
  error:
    'flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300',
  success:
    'flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-300',
  warning:
    'flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200',
};

const roleForVariant: Record<AdminInlineAlertVariant, string | undefined> = {
  error: 'alert',
  success: undefined,
  warning: 'status',
};

const ariaLiveForVariant: Record<AdminInlineAlertVariant, 'assertive' | 'polite'> = {
  error: 'assertive',
  success: 'polite',
  warning: 'polite',
};

export function AdminInlineAlert({
  children,
  variant,
}: {
  children: ReactNode;
  variant: AdminInlineAlertVariant;
}) {
  return (
    <div
      aria-live={ariaLiveForVariant[variant]}
      className={containerClass[variant]}
      role={roleForVariant[variant]}
    >
      <AdminInlineAlertIcon variant={variant} />
      <span>{children}</span>
    </div>
  );
}
