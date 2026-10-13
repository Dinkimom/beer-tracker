/** @vitest-environment jsdom */

import type { TaskPosition } from '@/types';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LanguageProvider } from '@/contexts/LanguageContext';

import { TaskArrowRelationshipMarker } from './TaskArrowRelationshipMarker';

function position(taskId: string, startDay: number): TaskPosition {
  return {
    assignee: 'dev',
    duration: 1,
    startDay,
    startPart: 0,
    taskId,
  };
}

function renderMarker(
  relationship: string | undefined,
  fromDay: number,
  toDay: number,
  relationshipLabel?: string
) {
  render(
    <LanguageProvider>
      <div id="task-from" />
      <div id="task-to" />
      <TaskArrowRelationshipMarker
        links={[
          {
            fromTaskId: 'from',
            id: 'link-1',
            relationship,
            relationshipLabel,
            toTaskId: 'to',
          },
        ]}
        taskPositions={
          new Map([
            ['from', position('from', fromDay)],
            ['to', position('to', toDay)],
          ])
        }
      />
    </LanguageProvider>
  );
}

describe('TaskArrowRelationshipMarker', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the stored type along the arrow', () => {
    renderMarker('blocks', 0, 2);
    expect(screen.getByText('Блокирует').getAttribute('data-task-link-relationship')).toBe(
      'Блокирует'
    );
  });

  it('flips the type when the arrow is drawn back toward the source', () => {
    renderMarker('blocks', 3, 0);
    expect(screen.getByText('Заблокирована').getAttribute('data-task-link-relationship')).toBe(
      'Заблокирована'
    );
  });

  it('shows the specific type when the same arrow also relates', () => {
    render(
      <LanguageProvider>
        <div id="task-from" />
        <div id="task-to" />
        <TaskArrowRelationshipMarker
          links={[
            {
              fromTaskId: 'from',
              id: 'link-relates',
              relationshipLabel: 'relates to',
              toTaskId: 'to',
            },
            {
              fromTaskId: 'to',
              id: 'link-qa',
              relationshipLabel: 'has linked QA task',
              toTaskId: 'from',
            },
          ]}
          taskPositions={
            new Map([
              ['from', position('from', 0)],
              ['to', position('to', 2)],
            ])
          }
        />
      </LanguageProvider>
    );
    expect(screen.queryByText('relates to')).toBeNull();
    expect(screen.getByText('has linked QA task')).toBeTruthy();
  });

  it('shows the Jira phrase in a two-line chip', () => {
    renderMarker(undefined, 0, 2, 'has linked TestOps task');
    const chip = screen.getByText('has linked TestOps task');
    expect(chip.className).toContain('line-clamp-2');
    expect(chip.className).toContain('w-32');
    expect(chip.className).toContain('task-link-relationship-chip');
    expect(chip.getAttribute('data-state')).toBe('open');
  });

  it('keeps the label mounted with an exit animation after hover ends', () => {
    const { rerender } = render(
      <LanguageProvider>
        <div id="task-from" />
        <div id="task-to" />
        <TaskArrowRelationshipMarker
          links={[
            {
              fromTaskId: 'from',
              id: 'link-1',
              relationshipLabel: 'has linked QA task',
              toTaskId: 'to',
            },
          ]}
          taskPositions={
            new Map([
              ['from', position('from', 0)],
              ['to', position('to', 2)],
            ])
          }
        />
      </LanguageProvider>
    );
    rerender(
      <LanguageProvider>
        <div id="task-from" />
        <div id="task-to" />
        <TaskArrowRelationshipMarker
          links={[]}
          taskPositions={
            new Map([
              ['from', position('from', 0)],
              ['to', position('to', 2)],
            ])
          }
        />
      </LanguageProvider>
    );
    expect(screen.getByText('has linked QA task').getAttribute('data-state')).toBe('closed');
  });

  it('does not render a label when the link has no type', () => {
    renderMarker(undefined, 0, 2);
    expect(document.querySelector('[data-task-link-relationship]')).toBeNull();
  });
});
