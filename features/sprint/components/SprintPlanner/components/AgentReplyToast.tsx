'use client';

/**
 * Тост «Claude ответил», пока чат агента свёрнут: кто и начало ответа; клик открывает чат.
 */
export function AgentReplyToast({
  openLabel,
  snippet,
  title,
  onOpen,
}: {
  openLabel: string;
  snippet: string;
  title: string;
  onOpen: () => void;
}) {
  return (
    <button
      className="-mx-1 flex max-w-[20rem] cursor-pointer flex-col items-start gap-0.5 rounded-md px-1 py-0.5 text-left transition-all duration-200 hover:bg-gray-500/[0.08] active:scale-[0.98] active:bg-gray-500/[0.14] dark:hover:bg-white/[0.06] dark:active:bg-white/[0.1]"
      data-agent-reply-toast=""
      type="button"
      onClick={onOpen}
    >
      <span className="text-[13px] font-medium">{title}</span>
      {snippet ? <span className="line-clamp-2 text-xs opacity-75">{snippet}</span> : null}
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{openLabel}</span>
    </button>
  );
}
