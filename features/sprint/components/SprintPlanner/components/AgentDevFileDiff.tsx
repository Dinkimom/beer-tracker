'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridgeFileDiff } from '@/features/swimlane/hooks/useAgentBridge';

/** Служебные строки `git diff` до первого куска: кто, что, индекс — в карточке не нужны. */
const HEADER_RE = /^(diff --git|index |--- |\+\+\+ |new file mode|deleted file mode|similarity index|rename (from|to) )/;

function lineClass(line: string): string {
  if (line.startsWith('@@')) {
    return 'text-blue-700 bg-blue-500/[0.06] dark:text-blue-300';
  }
  if (line.startsWith('+')) {
    return 'bg-green-500/[0.12] text-green-900 dark:text-green-200';
  }
  if (line.startsWith('-')) {
    return 'bg-red-500/[0.12] text-red-900 dark:text-red-200';
  }
  return 'text-gray-700 dark:text-gray-300';
}

/**
 * Изменения одного файла ветки прямо в карточке результата: куски `@@`, добавленное зелёным,
 * удалённое красным. Длинный дифф прокручивается; огромный обрезан — дальше в редакторе.
 */
export function AgentDevFileDiff({ path, sessionId }: { path: string; sessionId: string }) {
  const { t } = useI18n();
  const { data, isPending } = useAgentBridgeFileDiff(sessionId, path);
  if (isPending) {
    return <p className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('agentSession.resultDiffLoading')}</p>;
  }
  // Номер строки в диффе — её ключ: строки не переставляются и не правятся.
  const lines = (data?.diff ?? '')
    .split('\n')
    .filter((line) => line && !HEADER_RE.test(line))
    .map((text, number) => ({ number, text }));
  if (lines.length === 0) {
    return <p className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('agentSession.resultDiffEmpty')}</p>;
  }
  return (
    <div className="agent-chat-scroll max-h-80 overflow-auto rounded-md border border-gray-200 dark:border-gray-700" data-agent-dev-diff={path}>
      <pre className="min-w-fit font-mono text-[11px] leading-[1.55]">
        {lines.map((line) => (
          <div key={line.number} className={`whitespace-pre px-2 ${lineClass(line.text)}`}>
            {line.text}
          </div>
        ))}
      </pre>
      {data?.truncated ? <p className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('agentSession.resultDiffTruncated')}</p> : null}
    </div>
  );
}
