'use client';

import type { AgentTaskCandidate } from '@/lib/agentSessions/agentSkills';

/**
 * Задача в ответе «Что отдать агенту»: ключ, название и причина; у «можно отдать» — файлы, которые
 * агент нашёл в коде, у «нужно уточнить» — вопросы, на которые человеку ответить до передачи.
 */
export function AgentTaskCandidateInfo({ candidate }: { candidate: AgentTaskCandidate }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="shrink-0 font-mono text-gray-500 dark:text-gray-400">{candidate.taskKey}</span>
        <span className="truncate font-medium text-gray-900 dark:text-gray-100">{candidate.summary}</span>
      </span>
      <span className="block text-gray-500 dark:text-gray-400">{candidate.reason}</span>
      {candidate.files?.length ? (
        <span className="block truncate font-mono text-[10px] text-gray-400 dark:text-gray-500" title={candidate.files.join('\n')}>
          {candidate.files.join(' · ')}
        </span>
      ) : null}
      {candidate.questions?.length ? (
        <span className="mt-0.5 block space-y-0.5 text-gray-700 dark:text-gray-300">
          {candidate.questions.map((question) => (
            <span key={question} className="block before:mr-1 before:text-gray-400 before:content-['?']">
              {question}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
