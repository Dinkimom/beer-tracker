/**
 * Хук для управления логикой TaskTimeline
 */

'use client';

import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useState, useEffect } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { fetchIssueChangelog } from '@/lib/beerTrackerApi';

import { calculateStatusSummary } from '../utils/calculateStatusSummary';
import { processChangelog } from '../utils/processChangelog';

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

