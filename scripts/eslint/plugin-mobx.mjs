/**
 * Компонент, который берёт модель доски или MobX-стор, должен быть `observer`:
 * иначе он молча показывает устаревшее (ARCHITECTURE.md, «Модель доски и классы под вью»).
 *
 * Проверяются компоненты (имя с заглавной буквы), которые сами вызывают хук из STORE_HOOKS.
 * Хуки (`use*`) не проверяются — за них отвечает компонент, который их вызывает.
 */

const STORE_HOOKS = new Set(['useQuarterlyPlanBoard', 'useRootStore', 'useSprintBoard']);
/** Обёртки, через которые `observer` может смотреть на компонент: observer(forwardRef(function X…)). */
const TRANSPARENT_WRAPPERS = new Set(['forwardRef', 'memo']);

function isFunction(node) {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

function calleeName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return null;
}

function enclosingFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (isFunction(current)) return current;
  }
  return null;
}

/** Внешний узел функции с учётом обёрток вызовом: observer(...), forwardRef(...), memo(...). */
function outermostWrapped(fn) {
  let current = fn;
  while (current.parent?.type === 'CallExpression' && current.parent.arguments[0] === current) {
    current = current.parent;
  }
  return current;
}

function isWrappedInObserver(fn) {
  let current = fn;
  while (current.parent?.type === 'CallExpression' && current.parent.arguments[0] === current) {
    const name = calleeName(current.parent.callee);
    if (name === 'observer') return true;
    if (!TRANSPARENT_WRAPPERS.has(name)) return false;
    current = current.parent;
  }
  return false;
}

function componentName(fn) {
  if (fn.id) return fn.id.name;
  const outer = outermostWrapped(fn);
  if (outer.parent?.type === 'VariableDeclarator' && outer.parent.id.type === 'Identifier') {
    return outer.parent.id.name;
  }
  return null;
}

const observerReadsStore = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Компонент, читающий модель доски или MobX-стор, обёрнут в observer',
    },
    messages: {
      notObserver:
        'Компонент `{{name}}` вызывает `{{hook}}()`, но не обёрнут в observer — он не перерисуется при изменении стора. ' +
        'Оберните: `export const {{name}} = observer(function {{name}}(…) {…})`.',
    },
    schema: [],
  },
  create(context) {
    const candidates = [];
    const observedNames = new Set();

    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (name === 'observer' && node.arguments[0]?.type === 'Identifier') {
          observedNames.add(node.arguments[0].name);
          return;
        }
        if (node.callee.type !== 'Identifier' || !STORE_HOOKS.has(name)) return;
        const fn = enclosingFunction(node);
        if (!fn) return;
        const component = componentName(fn);
        if (!component || !/^[A-Z]/.test(component)) return;
        if (isWrappedInObserver(fn)) return;
        candidates.push({ component, hook: name, node });
      },
      'Program:exit'() {
        const reported = new Set();
        for (const { component, hook, node } of candidates) {
          if (observedNames.has(component) || reported.has(component)) continue;
          reported.add(component);
          context.report({ data: { hook, name: component }, messageId: 'notObserver', node });
        }
      },
    };
  },
};

export default {
  rules: {
    'observer-reads-store': observerReadsStore,
  },
};
