import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import typescriptSortKeys from 'eslint-plugin-typescript-sort-keys';
import perfectionist from 'eslint-plugin-perfectionist';
import unusedImports from 'eslint-plugin-unused-imports';
import sonarjs from 'eslint-plugin-sonarjs';
import i18nPlugin from './scripts/eslint/plugin-i18n.mjs';

/**
 * Политика качества (SonarJS + React Hooks). `pnpm lint` = `--max-warnings 0`.
 *
 * SonarJS (`sonarjs/strict-overrides` + слои ниже):
 * - High-signal (duplicated branches, identical functions, dead-store, slow-regex,
 *   todo/fixme-tag, …) → **error** в app/lib.
 * - nested-conditional / nested-functions / nested-template-literals:
 *   **error** в `lib/**` и `app/api/**`; **off** в UI (ветвистый JSX не дробить ради стиля).
 * - `sonarjs/no-unused-vars` → **off** (дублирует `unused-imports/*`, severity error).
 * - `sonarjs/pseudo-random` → **off** (нормально для UI/трекера).
 * - `scripts/**` — ослаблено (`scripts/relaxed-sonar`): complexity 25, todo/fixme warn.
 *
 * Cognitive complexity:
 * - lib/**, app/api/** → error при > 10
 * - features/**, components/**, contexts/**, hooks/**, app UI (tsx) → error при > 15
 *
 * React Hooks: recommended + `exhaustive-deps` → **error** (явно строже recommended warn).
 *
 * Плотность Sonar-срабатываний: `pnpm lint:sonar-density` (цель ≤ 6 / 1000 LoC).
 */

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    ...sonarjs.configs.recommended,
  },
  // SonarJS: high-signal rules error; nested-* default error (UI turns them off below)
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    name: 'sonarjs/strict-overrides',
    rules: {
      'sonarjs/cognitive-complexity': ['error', 10],
      'sonarjs/pseudo-random': 'off',
      'sonarjs/no-nested-conditional': 'error',
      'sonarjs/no-nested-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/todo-tag': 'error',
      'sonarjs/fixme-tag': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-ignored-return': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-small-switch': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',
      'sonarjs/prefer-while': 'error',
      // Неиспользуемые переменные: error через unused-imports/no-unused-vars (см. основной блок).
      // Sonar дублирует и ругается на «лишние» поля при omit через _ — оставляем выключенным.
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/no-dead-store': 'error',
      'sonarjs/redundant-type-aliases': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-gratuitous-expressions': 'error',
      'sonarjs/use-type-alias': 'error',
      'sonarjs/no-nested-assignment': 'error',
      'sonarjs/void-use': 'error',
      'sonarjs/slow-regex': 'error',
    },
  },
  // UI: выше complexity; nested-* off (ветвистый JSX — не стилевой долг)
  {
    files: [
      'features/**/*.{js,jsx,ts,tsx}',
      'components/**/*.{js,jsx,ts,tsx}',
      'contexts/**/*.{js,jsx,ts,tsx}',
      'hooks/**/*.{js,jsx,ts,tsx}',
      'app/**/*.{jsx,tsx}',
    ],
    name: 'sonarjs/ui-complexity',
    rules: {
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-nested-template-literals': 'off',
    },
  },
  // Ядро: lib + API — complexity 10 и nested-* error
  {
    files: ['lib/**/*.{js,jsx,ts,tsx}', 'app/api/**/*.{js,jsx,ts,tsx}'],
    name: 'sonarjs/core-complexity',
    rules: {
      'sonarjs/cognitive-complexity': ['error', 10],
      'sonarjs/no-nested-conditional': 'error',
      'sonarjs/no-nested-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
      'typescript-sort-keys': typescriptSortKeys,
      perfectionist: perfectionist,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // recommended: warn; с --max-warnings 0 всё равно гейт — фиксируем error явно
      'react-hooks/exhaustive-deps': 'error',
      // Отключаем стандартное правило, используем TypeScript версию
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript handles this
      
      // TypeScript правила
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off', // Выключаем в пользу unused-imports
      // Неиспользуемые импорты и переменные — только здесь, severity error (Sonar no-unused-vars отключён).
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          args: 'after-used',
        },
      ],
      
      // React правила
      'react/react-in-jsx-scope': 'off', // Не нужно в React 17+
      'react/prop-types': 'off', // Используем TypeScript для типизации
      // Неиспользуемые пропы (ограничения с TypeScript — см. доку react/no-unused-prop-types)
      'react/no-unused-prop-types': 'error',
      // Сортировка пропсов в JSX: сначала пропсы в алфавитном порядке, потом функции/обработчики
      'react/jsx-sort-props': [
        'error',
        {
          callbacksLast: true, // Функции/обработчики в конце
          shorthandFirst: false, // Не приоритезировать сокращенные пропсы
          ignoreCase: false,
          noSortAlphabetically: false, // Сортировать в алфавитном порядке
          reservedFirst: ['key', 'ref'], // key и ref первыми
        },
      ],
      // Сортировка интерфейсов: сначала свойства в алфавитном порядке, потом методы
      'perfectionist/sort-interfaces': [
        'warn',
        {
          type: 'natural',
          order: 'asc',
          groups: ['property', 'method'],
        },
      ],
      // Сортировка union типов
      '@typescript-eslint/sort-type-constituents': 'warn',
      // Сортировка ключей в интерфейсах и типах
      'typescript-sort-keys/interface': 'off', // Используем perfectionist/sort-interfaces
      'typescript-sort-keys/string-enum': 'warn', // perfectionist не поддерживает enum
      
      // === Безопасность ===
      // Запрет использования dangerouslySetInnerHTML без явного указания
      'react/no-danger': 'warn',
      // Запрет использования eval и подобных опасных функций
      'no-eval': 'error',
      'no-implied-eval': 'error',
      // Запрет использования innerHTML/outerHTML напрямую
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
          message: 'Использование innerHTML/outerHTML небезопасно. Используйте безопасные альтернативы.',
        },
        {
          selector: 'TSImportType',
          message:
            'Запрещены инлайн импорты типов (import("...").Type). Используйте обычный import type в начале файла.',
        },
        {
          selector: 'CallExpression[callee.type="FunctionExpression"]',
          message: 'IIFE (Immediately Invoked Function Expression) запрещены. Вынесите код в именованную функцию или отдельный модуль.',
        },
        {
          selector: 'CallExpression[callee.type="ArrowFunctionExpression"]',
          message: 'IIFE (Immediately Invoked Function Expression) запрещены. Вынесите код в именованную функцию или отдельный модуль.',
        },
      ],
      
      // === Качество кода ===
      // Контроль console.log (разрешаем только console.error и console.warn)
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      // Запрет неиспользуемых выражений
      'no-unused-expressions': 'error',
      // Запрет пустых блоков (кроме catch)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Запрет дублирования ключей в объектах
      'no-dupe-keys': 'error',
      // Запрет дублирования case в switch
      'no-duplicate-case': 'error',
      // Запрет использования == вместо ===
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      // Запрет использования var
      'no-var': 'error',
      // Предпочитать const для переменных, которые не переприсваиваются
      'prefer-const': 'warn',
      // Предпочитать template literals вместо конкатенации строк
      'prefer-template': 'warn',
      
      // === TypeScript специфичные правила ===
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': 'allow-with-description',
          'ts-check': false,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      '@typescript-eslint/no-empty-interface': 'warn',
      
      // === React специфичные правила ===
      // Запрет использования индексов в качестве key — отключено
      'react/no-array-index-key': 'off',
      // Один компонент на файл (Wave 2 strict)
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
      // Запрет использования небезопасных target="_blank" без rel="noopener noreferrer"
      'react/jsx-no-target-blank': 'error',
      // Требовать alt для img
      'react/jsx-no-useless-fragment': 'warn',
      // Запрет использования findDOMNode
      'react/no-find-dom-node': 'error',
      // Запрет использования isMounted
      'react/no-is-mounted': 'error',
      // Запрет использования string refs
      'react/no-string-refs': 'error',
      // Запрет использования UNSAFE_ методов жизненного цикла
      'react/no-unsafe': ['warn', { checkAliases: true }],
      // Предупреждение о пропсах, которые могут вызвать проблемы
      'react/no-unescaped-entities': 'warn',
      
      // === Асинхронный код ===
      // Предпочитать async/await вместо .then/.catch
      'prefer-promise-reject-errors': 'error',
      // Запрет промисов без обработки ошибок (требует type information)
      // '@typescript-eslint/no-floating-promises': 'warn',
      // Запрет await в циклах — отключено (допускаем последовательные вызовы по необходимости)
      'no-await-in-loop': 'off',
      // Требовать обработку ошибок в async функциях
      'require-await': 'error',
      
      // === Комментарии ===
      // Требовать описание для TODO/FIXME комментариев
      'no-warning-comments': [
        'warn',
        {
          terms: ['todo', 'fixme', 'xxx', 'hack'],
          location: 'start',
        },
      ],
      
      // === Импорты ===
      // Сортировка импортов
      'perfectionist/sort-imports': [
        'warn',
        {
          type: 'natural',
          order: 'asc',
          groups: [
            'type',
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'side-effect',
            'style',
          ],
        },
      ],
      // Примечание: import/no-unused-modules не поддерживается в ESLint flat config
      // Для проверки неиспользуемых экспортов рекомендуется использовать:
      // - TypeScript компилятор с флагом --noUnusedLocals
      // - Отдельные инструменты анализа кода (ts-unused-exports, knip)
      
      // === Общие правила качества ===
      // Запрет использования debugger
      'no-debugger': 'error',
      // Запрет использования alert, confirm, prompt
      'no-alert': 'warn',
      // Запрет использования with
      'no-with': 'error',
      // Запрет использования label
      'no-labels': 'error',
      // Запрет использования void оператора (может быть слишком строгим для TypeScript)
      'no-void': 'off',
      // Запрет использования множественных пустых строк
      'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
      // Требовать точку с запятой
      'semi': ['error', 'always'],
      // Запрет trailing пробелов
      'no-trailing-spaces': 'warn',
      // Запрет пробелов перед запятыми
      'comma-spacing': ['error', { before: false, after: true }],
      // Запрет пробелов внутри скобок объектов
      'object-curly-spacing': ['error', 'always'],
      // Запрет пробелов внутри скобок массивов
      'array-bracket-spacing': ['error', 'never'],
      // Лимит строк в файле (Wave 2 strict)
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['lib/i18n/messages/en.ts', 'lib/i18n/messages/ru.ts'],
    name: 'i18n-messages/max-lines-off',
    rules: {
      'max-lines': 'off',
    },
  },
  // UI-копирайт только через t()/translate(). Ошибки app/api/** не проверяем.
  // Файлы с историческим долгом — scripts/eslint/i18n-literal-allowlist.json.
  {
    files: [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'contexts/**/*.{ts,tsx}',
      'features/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
      'lib/comments/**/*.{ts,tsx}',
      'lib/holidays.ts',
    ],
    ignores: ['app/api/**', '**/*.{test,spec}.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    name: 'i18n/no-literal-ui-string',
    plugins: {
      i18n: i18nPlugin,
    },
    rules: {
      'i18n/no-literal-ui-string': 'error',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    name: 'scripts/mjs-node-globals',
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.{js,ts,mjs}'],
    name: 'scripts/relaxed-sonar',
    rules: {
      'sonarjs/cognitive-complexity': ['error', 25],
      'sonarjs/slow-regex': 'off',
      'sonarjs/todo-tag': 'warn',
      'sonarjs/fixme-tag': 'warn',
      'sonarjs/no-os-command-from-path': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-nested-template-literals': 'off',
    },
  },
  {
    files: ['eslint.config.mjs'],
    name: 'eslint-config/comment-policy-off',
    rules: {
      'no-warning-comments': 'off',
      'sonarjs/todo-tag': 'off',
      'sonarjs/fixme-tag': 'off',
    },
  },
  // Клиентский UI: /api/* только через lib/api (beerTrackerApi), не raw fetch
  {
    files: [
      'features/**/*.{js,jsx,ts,tsx}',
      'components/**/*.{js,jsx,ts,tsx}',
      'contexts/**/*.{js,jsx,ts,tsx}',
      'hooks/**/*.{js,jsx,ts,tsx}',
      'app/**/*.{jsx,tsx}',
    ],
    name: 'client/no-raw-api-fetch',
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
          message: 'Использование innerHTML/outerHTML небезопасно. Используйте безопасные альтернативы.',
        },
        {
          selector: 'TSImportType',
          message:
            'Запрещены инлайн импорты типов (import("...").Type). Используйте обычный import type в начале файла.',
        },
        {
          selector: 'CallExpression[callee.type="FunctionExpression"]',
          message: 'IIFE (Immediately Invoked Function Expression) запрещены. Вынесите код в именованную функцию или отдельный модуль.',
        },
        {
          selector: 'CallExpression[callee.type="ArrowFunctionExpression"]',
          message: 'IIFE (Immediately Invoked Function Expression) запрещены. Вынесите код в именованную функцию или отдельный модуль.',
        },
        {
          selector: 'CallExpression[callee.name="fetch"] > Literal[value=/^\\x2fapi/]',
          message:
            'Не вызывайте fetch("/api/...") из UI. Используйте getPlannerBeerTrackerApi() через модули @/lib/api/*.',
        },
        {
          selector:
            'CallExpression[callee.name="fetch"] > TemplateLiteral > TemplateElement[value.raw=/\\x2fapi/]',
          message:
            'Не вызывайте fetch(`/api/...`) из UI. Используйте getPlannerBeerTrackerApi() через модули @/lib/api/*.',
        },
      ],
    },
  },
  // API routes: SQL только через lib/<domain>/*Repository
  {
    files: ['app/api/**/*.{js,ts}'],
    name: 'api/no-direct-db',
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/db',
              importNames: ['query', 'pool', 'runBeerTrackerTransaction', 'qualifyBeerTrackerTables'],
              message:
                'Не импортируйте query/pool в app/api. SQL — в lib/<domain>/*Repository.ts.',
            },
          ],
        },
      ],
    },
  },
  // UI: DTO и HTTP только через lib/api, не через app/api routes и не raw beerTrackerApi
  {
    files: [
      'features/**/*.{js,jsx,ts,tsx}',
      'components/**/*.{js,jsx,ts,tsx}',
      'contexts/**/*.{js,jsx,ts,tsx}',
      'hooks/**/*.{js,jsx,ts,tsx}',
    ],
    name: 'layers/no-app-api-import',
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/api', '@/app/api/*', '@/app/api/**'],
              message:
                'Не импортируйте из app/api в UI/lib. DTO — в @/lib/api/types (или lib/<domain>), HTTP — @/lib/api/*.',
            },
          ],
          paths: [
            {
              name: '@/lib/axios',
              importNames: ['beerTrackerApi'],
              message:
                'Не импортируйте beerTrackerApi в UI. Используйте getPlannerBeerTrackerApi() через модули @/lib/api/*.',
            },
          ],
        },
      ],
    },
  },
  // lib без зависимости на UI-домен features/ (+ сохраняем запрет app/api и beerTrackerApi)
  {
    files: ['lib/**/*.{js,ts,tsx}'],
    ignores: ['lib/plannerBeerTrackerApiOverride.ts'],
    name: 'layers/no-features-import',
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/api', '@/app/api/*', '@/app/api/**'],
              message:
                'Не импортируйте из app/api в UI/lib. DTO — в @/lib/api/types (или lib/<domain>), HTTP — @/lib/api/*.',
            },
            {
              group: ['@/features', '@/features/*', '@/features/**'],
              message:
                'Не импортируйте из features в lib. Вынесите типы/утилиты в lib/<domain>.',
            },
          ],
          paths: [
            {
              name: '@/lib/axios',
              importNames: ['beerTrackerApi'],
              message:
                'Не импортируйте beerTrackerApi в UI. Используйте getPlannerBeerTrackerApi() через модули @/lib/api/*.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'node_modules/**',
      'next-env.d.ts',
      '.next',
      'coverage/**',
      'storybook-static/**',
      'public/sw.js',
    ],
  },
];
