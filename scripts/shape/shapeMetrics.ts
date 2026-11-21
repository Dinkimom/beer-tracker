/**
 * Метрики формы кода, которые делают доску дорогой в поддержке (см. AGENTS.md, «Форма кода»):
 * - ширина `*Props` — сколько полей у пропсов компонента;
 * - проброс — доля JSX-атрибутов, которые передают полученный пропс без вычислений
 *   (`x={x}`, `y={props.x}`, `z={handlers.z}`): слой, который в основном передаёт дальше;
 * - ширина хука — сколько полей хук принимает и сколько отдаёт объектом: хук-дирижёр, который
 *   собирает всё и раздаёт всё (`{...viewModel}` в компонент), — та же широкая поверхность, что `*Props`;
 *
 * Длину не меряем: длину любого файла держит ESLint `max-lines` (500), а длинный, но цельный
 * хук ради счётчика строк дробить не нужно — дорого обходится ширина, а не длина.
 */
import ts from 'typescript';

export const SHAPE_LIMITS = {
  /** Больше полей в `*Props` — пора группировать в объект-срез или читать из стора. */
  maxPropsWidth: 20,
  /** Компонент, у которого проброс выше этой доли, в основном передаёт пропсы дальше. */
  maxPassThroughShare: 0.5,
  /** Проброс считаем только у компонентов с заметным числом атрибутов. */
  minAttrsForPassThrough: 20,
  /** Полей у входа хука (деструктурированный объект или позиционные параметры). */
  maxHookInputs: 15,
  /** Полей у объекта, который хук возвращает. */
  maxHookOutputs: 20,
} as const;

type ShapeMetric = 'hook-inputs' | 'hook-outputs' | 'pass-through' | 'props-width';

export interface ShapeViolation {
  file: string;
  metric: ShapeMetric;
  /** Имя интерфейса для ширины пропсов или хука для его ширины, иначе пусто. */
  name: string;
  /** Для pass-through — процент, иначе число. */
  value: number;
}

function countTypeMembers(node: ts.TypeNode | undefined): number {
  if (!node) return 0;
  if (ts.isTypeLiteralNode(node)) return node.members.length;
  if (ts.isIntersectionTypeNode(node)) {
    return node.types.reduce((sum, part) => sum + countTypeMembers(part), 0);
  }
  return 0;
}

/** Собственные поля `*Props` (поля из `extends` и пересечений с именованными типами не считаются). */
function measurePropsWidths(source: ts.SourceFile): Array<{ name: string; width: number }> {
  const out: Array<{ name: string; width: number }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node) && node.name.text.endsWith('Props')) {
      out.push({ name: node.name.text, width: node.members.length });
    } else if (ts.isTypeAliasDeclaration(node) && node.name.text.endsWith('Props')) {
      const width = countTypeMembers(node.type);
      if (width > 0) out.push({ name: node.name.text, width });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

function hookFunctionOf(node: ts.Node): { body: ts.Node; fn: ts.SignatureDeclaration; name: string } | null {
  if (ts.isFunctionDeclaration(node) && node.name && node.body && /^use[A-Z]/.test(node.name.text)) {
    return { body: node.body, fn: node, name: node.name.text };
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^use[A-Z]/.test(node.name.text)) {
    const init = node.initializer;
    if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
      return { body: init.body, fn: init, name: node.name.text };
    }
  }
  return null;
}

function countHookInputs(fn: ts.SignatureDeclaration): number {
  const first = fn.parameters[0];
  if (first && ts.isObjectBindingPattern(first.name)) return first.name.elements.length;
  if (first && fn.parameters.length === 1 && first.type) return countTypeMembers(first.type);
  return fn.parameters.length;
}

/** Самый широкий объект, который хук возвращает сам (не из вложенных функций). */
function countHookOutputs(body: ts.Node): number {
  let widest = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)) {
      widest = Math.max(widest, node.expression.properties.length);
    }
    if (!ts.isFunctionLike(node)) ts.forEachChild(node, visit);
  };
  if (ts.isObjectLiteralExpression(body)) return body.properties.length;
  ts.forEachChild(body, visit);
  return widest;
}

function measureHookWidths(source: ts.SourceFile): Array<{ inputs: number; name: string; outputs: number }> {
  const out: Array<{ inputs: number; name: string; outputs: number }> = [];
  const visit = (node: ts.Node): void => {
    const hook = hookFunctionOf(node);
    if (hook) {
      out.push({ inputs: countHookInputs(hook.fn), name: hook.name, outputs: countHookOutputs(hook.body) });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

function addBindingNames(name: ts.BindingName, names: Set<string>): void {
  if (ts.isIdentifier(name)) {
    names.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) addBindingNames(element.name, names);
  }
}

function isComponentPropsParam(param: ts.ParameterDeclaration, source: ts.SourceFile): boolean {
  const type = param.type;
  if (type && ts.isTypeReferenceNode(type) && /Props$/.test(type.typeName.getText(source))) return true;
  return ts.isIdentifier(param.name) && param.name.text === 'props';
}

/** Имена, под которыми компоненты файла получили пропсы: параметр `{ a, b }: XProps`, `props` и `const { a } = props`. */
function collectPropNames(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    const isFunction = ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node);
    const first = isFunction ? node.parameters[0] : undefined;
    if (first && isComponentPropsParam(first, source)) addBindingNames(first.name, names);
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isIdentifier(node.initializer) &&
      node.initializer.text === 'props'
    ) {
      addBindingNames(node.name, names);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

/** Значение передаёт полученный пропс без вычислений: `x`, `props.x`, `handlers.y` (корень — пропс). */
function isForwardedProp(expression: ts.Expression, propNames: ReadonlySet<string>): boolean {
  let node: ts.Expression = expression;
  while (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isPropertyAccessExpression(node)) {
    node = node.expression;
  }
  return ts.isIdentifier(node) && propNames.has(node.text);
}

/** JSX-атрибуты файла и сколько из них передают дальше полученный пропс без изменений. */
function measurePassThrough(source: ts.SourceFile): { attrs: number; passThrough: number } {
  const propNames = collectPropNames(source);
  let attrs = 0;
  let passThrough = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node)) {
      attrs += 1;
      const init = node.initializer;
      const expression = init && ts.isJsxExpression(init) ? init.expression : undefined;
      if (expression && isForwardedProp(expression, propNames)) passThrough += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { attrs, passThrough };
}

/** Нарушения порогов в одном файле. */
export function measureFileShape(file: string, text: string): ShapeViolation[] {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const violations: ShapeViolation[] = [];

  for (const { name, width } of measurePropsWidths(source)) {
    if (width > SHAPE_LIMITS.maxPropsWidth) {
      violations.push({ file, metric: 'props-width', name, value: width });
    }
  }

  const { attrs, passThrough } = measurePassThrough(source);
  if (attrs >= SHAPE_LIMITS.minAttrsForPassThrough && passThrough / attrs > SHAPE_LIMITS.maxPassThroughShare) {
    violations.push({ file, metric: 'pass-through', name: '', value: Math.round((passThrough / attrs) * 100) });
  }

  for (const { inputs, name, outputs } of measureHookWidths(source)) {
    if (inputs > SHAPE_LIMITS.maxHookInputs) {
      violations.push({ file, metric: 'hook-inputs', name, value: inputs });
    }
    if (outputs > SHAPE_LIMITS.maxHookOutputs) {
      violations.push({ file, metric: 'hook-outputs', name, value: outputs });
    }
  }

  return violations;
}

export function violationKey(violation: Pick<ShapeViolation, 'file' | 'metric' | 'name'>): string {
  return [violation.file, violation.metric, violation.name].filter(Boolean).join('::');
}

export type ShapeBaseline = Record<string, number>;

interface ShapeComparison {
  /** Нет в baseline — новый долг. */
  added: ShapeViolation[];
  /** Есть в baseline, но вырос. */
  grown: Array<ShapeViolation & { baseline: number }>;
  /** В baseline, но уже меньше или исчез — можно обновить baseline. */
  improved: string[];
}

/** Храповик: нарушения из baseline могут только уменьшаться, новых быть не должно. */
export function compareWithBaseline(current: readonly ShapeViolation[], baseline: ShapeBaseline): ShapeComparison {
  const added: ShapeViolation[] = [];
  const grown: Array<ShapeViolation & { baseline: number }> = [];
  for (const violation of current) {
    const allowed = baseline[violationKey(violation)];
    if (allowed === undefined) added.push(violation);
    else if (violation.value > allowed) grown.push({ ...violation, baseline: allowed });
  }
  const currentByKey = new Map(current.map((violation) => [violationKey(violation), violation.value]));
  const improved = Object.keys(baseline).filter((key) => {
    const value = currentByKey.get(key);
    return value === undefined || value < baseline[key]!;
  });
  return { added, grown, improved };
}

export function toBaseline(violations: readonly ShapeViolation[]): ShapeBaseline {
  const entries = violations
    .map((violation) => [violationKey(violation), violation.value] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}
