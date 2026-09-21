'use client';

import { getStatusColors, resolvePaletteStatusKey } from '@/utils/statusColors';

interface StatusTagProps {
  className?: string;
  /** Подпись из трекера (`display` / `statusName`); иначе показывается `status` как есть */
  label?: string;
  status: string | null | undefined;
  /** Ключ палитры карточки из интеграции (`visualToken`), как у TaskCard */
  statusColorKey?: string;
}

export function StatusTag({ status, label, className = '', statusColorKey }: StatusTagProps) {
  if (!status) return null;

  const paletteKey = resolvePaletteStatusKey(status, statusColorKey);
  const c = getStatusColors(paletteKey);
  const text = label?.trim() || status;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium leading-none whitespace-nowrap border shrink-0 ${c.bg} ${c.bgDark ?? ''} ${c.text} ${c.textDark ?? ''} ${c.border} ${c.borderDark ?? ''} ${className}`}
      title={text}
    >
      {text}
    </span>
  );
}
