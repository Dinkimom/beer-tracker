import type { Rule } from 'eslint';

import { RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';

import plugin from './plugin-i18n.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parserOptions: { ecmaFeatures: { jsx: true } },
    sourceType: 'module',
  },
});

describe('i18n/no-literal-ui-string', () => {
  it('flags inline UI copy and allows translator calls', () => {
    expect(() => {
      ruleTester.run(
        'no-literal-ui-string',
        plugin.rules['no-literal-ui-string'] as Rule.RuleModule,
        {
          invalid: [
            { code: 'const label = "Привет";', errors: [{ messageId: 'literal' }] },
            { code: 'const label = `Участник ${name}`;', errors: [{ messageId: 'literal' }] },
            { code: 'export function Demo() { return <span>Hello</span>; }', errors: [{ messageId: 'literal' }] },
            {
              code: 'export function Demo() { return <input placeholder="Search" />; }',
              errors: [{ messageId: 'literal' }],
            },
          ],
          valid: [
            { code: 'const key = "common.ok";' },
            { code: 'const label = t("common.ok");' },
            { code: 'const label = translate(language, "common.ok");' },
            { code: 'export function Demo() { return <span>{t("common.ok")}</span>; }' },
            {
              code: 'export function Demo() { return <input placeholder={t("common.searchPlaceholder")} />; }',
            },
            { code: 'import { foo } from "@/lib/holidays";' },
          ],
        }
      );
    }).not.toThrow();
  });
});
