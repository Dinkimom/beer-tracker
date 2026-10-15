import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

const MARK_CLASS =
  'flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10';

export function McpOAuthClientMark({
  brand,
  label,
}: {
  brand: McpOAuthClientBrand;
  label: string;
}) {
  if (brand === 'cursor') {
    return (
      <span aria-label={label} className={`${MARK_CLASS} bg-[#141414] text-white`}>
        <svg aria-hidden className="h-8 w-8" fill="none" viewBox="0 0 24 24">
          <path d="M5 3.5 19.5 12 12.2 13.8 10 20.5 5 3.5Z" fill="currentColor" />
        </svg>
      </span>
    );
  }

  if (brand === 'claude') {
    return (
      <span aria-label={label} className={`${MARK_CLASS} bg-[#D97757] text-white`}>
        <svg aria-hidden className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.2 13.7 8.3 19.8 10 13.7 11.7 12 17.8 10.3 11.7 4.2 10 10.3 8.3 12 2.2Z" />
          <path d="M18.2 14.1 18.9 16.6 21.4 17.3 18.9 18 18.2 20.5 17.5 18 15 17.3 17.5 16.6 18.2 14.1Z" />
          <path d="M5.8 14.1 6.5 16.6 9 17.3 6.5 18 5.8 20.5 5.1 18 2.6 17.3 5.1 16.6 5.8 14.1Z" />
        </svg>
      </span>
    );
  }

  if (brand === 'openai') {
    return (
      <span aria-label={label} className={`${MARK_CLASS} bg-[#10A37F] text-white`}>
        <svg aria-hidden className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.3 10.1a5.1 5.1 0 0 0-2.8-7.3 5.2 5.2 0 0 0-5.5 1.3A5.1 5.1 0 0 0 7.2 2a5.1 5.1 0 0 0-3.4 7.5A5.1 5.1 0 0 0 1.7 15a5.2 5.2 0 0 0 5.5 4.2 5.1 5.1 0 0 0 7.8 2.7 5.1 5.1 0 0 0 7.3-2.9 5.1 5.1 0 0 0 0-8.9Zm-8.1 9.3a3.8 3.8 0 0 1-2.4-.9l.1-.1 3.3-1.9a.3.3 0 0 0 .1-.4v-4.6l1.4.8v5.5a3.8 3.8 0 0 1-2.5 1.6Zm-6.5-2.8a3.8 3.8 0 0 1-.4-2.5l.1.1 3.3 1.9a.3.3 0 0 0 .4 0l4-2.3v1.6l-3.4 2a3.8 3.8 0 0 1-4 0Zm-.8-7.1a3.8 3.8 0 0 1 2-.8v3.9a.3.3 0 0 0 .1.2l4 2.3-1.4.8-3.4-1.9a3.8 3.8 0 0 1-1.3-4.5Zm11.3 2.6-4-2.3 1.4-.8 3.4 1.9a3.8 3.8 0 0 1-1.4 6.8v-3.9a.3.3 0 0 0-.1-.2Zm1.4-2.6-.1-.1-3.3-1.9a.3.3 0 0 0-.4 0l-4 2.3V8.2l3.4-2a3.8 3.8 0 0 1 4.4 6.2ZM8.7 7.4l-1.4.8V4.7a3.8 3.8 0 0 1 6.2-2 3.8 3.8 0 0 1 .7 1l-.1.1-3.3 1.9a.3.3 0 0 0-.1.4l.1 4.6-1.4-.8Z" />
        </svg>
      </span>
    );
  }

  const initial = (label.trim().charAt(0) || '?').toUpperCase();
  return (
    <span
      aria-label={label}
      className={`${MARK_CLASS} bg-gradient-to-br from-slate-600 to-slate-800 text-xl font-semibold text-white`}
    >
      {initial}
    </span>
  );
}
