/**
 * Запрещает инлайн-текст UI вне сервиса переводов (`t` / `translate`).
 * Ошибки API (`app/api/**`) в скоуп правила не входят — задаётся в eslint.config.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import allowlist from './i18n-literal-allowlist.json' with { type: 'json' };

const CYRILLIC_RE = /[\u0400-\u04FF]/;
const LETTER_RE = /\p{L}/u;
const TRANSLATION_CALLEES = new Set(['has', 'hasTranslation', 't', 'translate']);
const USER_FACING_ATTRS = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'caption',
  'confirmLabel',
  'content',
  'description',
  'emptyPlaceholder',
  'helperText',
  'hint',
  'label',
  'placeholder',
  'searchPlaceholder',
  'title',
]);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ALLOWLISTED_FILES = new Set(allowlist.files);

function toPosixRel(filename) {
  return path.relative(REPO_ROOT, filename).split(path.sep).join('/');
}

function calleeName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return null;
}

function isInsideTranslationCall(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'CallExpression' && TRANSLATION_CALLEES.has(calleeName(current.callee))) {
      return true;
    }
  }
  return false;
}

function isImportOrExportSource(node) {
  const parent = node.parent;
  if (!parent) return false;
  return (
    parent.type === 'ImportDeclaration' ||
    parent.type === 'ExportAllDeclaration' ||
    parent.type === 'ExportNamedDeclaration' ||
    parent.type === 'ImportExpression'
  );
}

function templateText(node) {
  return node.quasis.map((quasi) => quasi.value.cooked ?? '').join(' ');
}

function hasLetters(value) {
  return typeof value === 'string' && LETTER_RE.test(value.trim());
}

function hasCyrillic(value) {
  return typeof value === 'string' && CYRILLIC_RE.test(value);
}

function jsxAttributeName(node) {
  if (node.name.type === 'JSXIdentifier') {
    return node.name.name;
  }
  if (node.name.type === 'JSXNamespacedName') {
    return `${node.name.namespace.name}-${node.name.name.name}`;
  }
  return null;
}

const plugin = {
  meta: {
    name: 'beer-tracker-i18n',
  },
  rules: {
    'no-literal-ui-string': {
      create(context) {
        if (ALLOWLISTED_FILES.has(toPosixRel(context.filename))) {
          return {};
        }

        function report(node) {
          context.report({ messageId: 'literal', node });
        }

        function checkCyrillicLiteral(node) {
          if (typeof node.value !== 'string') return;
          if (isImportOrExportSource(node) || isInsideTranslationCall(node)) return;
          if (node.parent?.type === 'JSXAttribute') return;
          if (!hasCyrillic(node.value)) return;
          report(node);
        }

        return {
          JSXAttribute(node) {
            const name = jsxAttributeName(node);
            if (!name || !USER_FACING_ATTRS.has(name)) return;

            const value = node.value;
            if (value?.type === 'Literal' && hasLetters(value.value) && !isInsideTranslationCall(value)) {
              report(value);
              return;
            }
            if (value?.type !== 'JSXExpressionContainer') return;

            const expression = value.expression;
            if (expression.type === 'Literal' && hasLetters(expression.value) && !isInsideTranslationCall(expression)) {
              report(expression);
              return;
            }
            if (
              expression.type === 'TemplateLiteral' &&
              hasLetters(templateText(expression)) &&
              !isInsideTranslationCall(expression)
            ) {
              report(expression);
            }
          },
          JSXText(node) {
            if (hasLetters(node.value)) {
              report(node);
            }
          },
          Literal(node) {
            checkCyrillicLiteral(node);
          },
          TemplateLiteral(node) {
            if (isInsideTranslationCall(node)) return;
            if (hasCyrillic(templateText(node))) {
              report(node);
            }
          },
        };
      },
      meta: {
        docs: {
          description: 'Disallow inline UI copy; use t() / translate() from the i18n service.',
        },
        messages: {
          literal:
            'Инлайн-текст UI запрещён. Вынесите строку в lib/i18n/messages и используйте t() / translate().',
        },
        type: 'problem',
      },
    },
  },
};

export default plugin;
