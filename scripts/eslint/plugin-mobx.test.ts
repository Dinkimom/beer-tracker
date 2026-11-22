import type { Rule } from 'eslint';

import { RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';

import plugin from './plugin-mobx.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parserOptions: { ecmaFeatures: { jsx: true } },
    sourceType: 'module',
  },
});

describe('mobx/observer-reads-store', () => {
  it('requires observer on components that read the board model or a MobX store', () => {
    expect(() => {
      ruleTester.run('observer-reads-store', plugin.rules['observer-reads-store'] as Rule.RuleModule, {
        invalid: [
          {
            code: 'export function Card() { const board = useSprintBoard(); return <div>{board.sprintId}</div>; }',
            errors: [{ messageId: 'notObserver' }],
          },
          {
            code: 'export const Menu = () => { const { overlays } = useRootStore().sprintPlannerUi; return null; };',
            errors: [{ messageId: 'notObserver' }],
          },
          {
            code: 'export const Row = memo(function Row() { const { menu } = useQuarterlyPlanBoard(); return null; });',
            errors: [{ messageId: 'notObserver' }],
          },
        ],
        valid: [
          { code: 'export const Card = observer(function Card() { useSprintBoard(); return null; });' },
          { code: 'export const Card = observer(() => { useSprintBoard(); return null; });' },
          {
            code: 'export const Card = observer(forwardRef(function Card(props, ref) { useRootStore(); return null; }));',
          },
          { code: 'function Card() { useSprintBoard(); return null; } export default observer(Card);' },
          { code: 'export function useCardState() { return useSprintBoard().sprintId; }' },
          { code: 'export function Card() { const store = useOtherStore(); return null; }' },
        ],
      });
    }).not.toThrow();
  });
});
