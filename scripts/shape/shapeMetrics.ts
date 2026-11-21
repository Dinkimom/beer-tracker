/**
 * Метрики формы кода, которые делают доску дорогой в поддержке (см. AGENTS.md, «Форма кода»):
 * - ширина `*Props` — сколько полей у пропсов компонента;
 * - проброс — доля JSX-атрибутов, которые передают полученный пропс без вычислений
 *   (`x={x}`, `y={props.x}`, `z={handlers.z}`): слой, который в основном передаёт дальше;
 * - размер хука — непустые строки файла `use*.ts(x)`.
 */
import ts from 'typescript';

export const SHAPE_LIMITS = {
  /** Больше полей в `*Props` — пора группировать в объект-срез или читать из стора. */
  maxPropsWidth: 20,
  /** Компонент, у которого проброс выше этой доли, в основном передаёт пропсы дальше. */
  maxPassThroughShare: 0.5,
  /** Проброс считаем только у компонентов с заметным числом атрибутов. */
  minAttrsForPassThrough: 20,
  /** Хук длиннее — дирижёр, который стоит резать по зонам. */
  maxHookLines: 300,
} as const;

type ShapeMetric = 'hook-lines' | 'pass-through' | 'props-width';

export interface ShapeViolation {
  file: string;
  metric: ShapeMetric;
  /** Имя интерфейса для ширины пропсов, иначе пусто. */
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

/** Непустые строки без комментариев. */
export function countCodeLines(text: string): number {
  let inBlock = false;
  let count = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('/*')) {
      inBlock = !line.includes('*/');
      continue;
    }
    count += 1;
  }
  return count;
}

function isHookFile(file: string): boolean {
  return /(^|\/)use[A-Z]\w*\.tsx?$/.test(file);
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

  if (isHookFile(file)) {
    const lines = countCodeLines(text);
    if (lines > SHAPE_LIMITS.maxHookLines) {
      violations.push({ file, metric: 'hook-lines', name: '', value: lines });
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
