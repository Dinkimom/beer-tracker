import type { ReactNode } from 'react';

import { hPage, muted } from '@/features/admin/adminUiTokens';

interface AdminPageHeaderProps {
  actions?: ReactNode;
  description?: string;
  title: string;
  titleId?: string;
}

export function AdminPageHeader({ actions, description, title, titleId }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className={hPage} id={titleId}>
          {title}
        </h1>
        {description ? <p className={`mt-1.5 max-w-2xl ${muted}`}>{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
