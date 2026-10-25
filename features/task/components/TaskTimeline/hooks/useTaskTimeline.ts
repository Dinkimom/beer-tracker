/**
 * Хук для управления логикой TaskTimeline
 */

'use client';

import type { StatusDuration, StatusSummary } from '../types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useState, useEffect } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { fetchIssueChangelog } from '@/lib/beerTrackerApi';

import { processChangelog } from '../utils/processChangelog';

const RELEVANT_STATUSES = ['inprogress', 'intesting'];

/** Сводка по статусам «в работе» и «в тестировании»: суммарное время, от большего к меньшему. */
function calculateStatusSummary(statusDurations: StatusDuration[]): StatusSummary[] {
  // Суммируем время по статусам (если задача возвращалась в один статус несколько раз)
  // Фильтруем только нужные статусы
  const statusSummaryMap = new Map<string, StatusSummary>();

  statusDurations.forEach((status) => {
    // Фильтруем только inProgress и inTesting
    const statusKeyLower = status.statusKey.toLowerCase();
    if (!RELEVANT_STATUSES.includes(statusKeyLower)) {
      return;
    }

    const existing = statusSummaryMap.get(status.statusKey);
    if (existing) {
      existing.totalDurationMs += status.durationMs;
      existing.count += 1;
    } else {
      statusSummaryMap.set(status.statusKey, {
        statusKey: status.statusKey,
        statusName: status.statusName,
        totalDurationMs: status.durationMs,
        count: 1,
      });
    }
  });

  // Сортируем по времени (от большего к меньшему)
  return Array.from(statusSummaryMap.values())
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs);
}

export function useTaskTimeline(issueKey: string) {
  const { t } = useI18n();
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [loading, setLoading] = useState(!!issueKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!issueKey) {
      // Используем setTimeout для асинхронного setState
      setTimeout(() => {
        setChangelog([]);
        setComments([]);
        setError(null);
        setLoading(false);
      }, 0);
      return;
    }

    let cancelled = false;
    // Используем setTimeout для асинхронного setState
    setTimeout(() => {
      if (!cancelled) {
        setError(null);
      }
    }, 0);

    // Используем setTimeout для асинхронного setState
    setTimeout(() => {
      if (!cancelled) {
        setLoading(true);

        async function loadChangelog() {
          try {
            const data = await fetchIssueChangelog(issueKey);
            if (!cancelled) {
              setChangelog(data.changelog);
              setComments(data.comments);
              setLoading(false);
            }
          } catch (err) {
            if (!cancelled) {
              console.error('Failed to fetch changelog:', err);
              setError(t('task.timeline.loadChangelogFailed'));
              setLoading(false);
            }
          }
        }

        loadChangelog();
      }
    }, 0);

    return () => {
      cancelled = true;
    };
  }, [issueKey, t]);

  const statusDurations = processChangelog(changelog);
  const statusSummaries = calculateStatusSummary(statusDurations);

  return {
    loading,
    error,
    statusSummaries,
    statusDurations,
    comments,
  };
}
