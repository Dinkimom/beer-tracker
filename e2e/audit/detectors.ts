import type { Page } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';

import { createDemoFixtureSeed } from '@/lib/demo/demoFixtureSeed';
import { buildDemoQuarterlyPlan, buildDemoQuarterlyPlanContent } from '@/lib/demo/demoQuarterlyPlanSeed';
import { enMessages } from '@/lib/i18n/messages/en';
import { flattenMessagesToDotMap } from '@/lib/i18n/messages/messageTree';
import { ruMessages } from '@/lib/i18n/messages/ru';

/**
 * Детекторы проблем интерфейса: не «изменилось ли», а «плохо ли сейчас». Каждая находка — со стабильным
 * ключом (правило + элемент по доступному имени), чтобы известные проблемы можно было зафиксировать списком,
 * а падать только на новых.
 *
 * - `axe:*` — WCAG 2.1 A/AA: контраст, имена контролов, вложенные интерактивные элементы, ARIA;
 * - `clip:horizontal` / `clip:vertical` — текст не помещается и обрезан без многоточия и без подсказки
 *   (в том числе `truncate` на flex-контейнере: многоточие там не рисуется);
 * - `covered` — ни одна точка видимой части контрола не кликается: сверху другой элемент;
 * - `button:cursor` — кнопка или ссылка без курсора-руки (перетаскиваемому можно grab/move);
 * - `button:disabled-looks-active` — выключенная кнопка с курсором-рукой;
 * - `button:no-hover` — наведение не меняет вид кнопки (правило AGENTS.md «Кнопка интерактивна»);
 * - `i18n:untranslated` — строка мимо словаря: в английском интерфейсе — кириллица, в русском — фраза из
 *   английского словаря, у которой есть перевод (данные фикстуры — английские, поэтому латиница сама по себе
 *   ничего не значит).
 */

export interface Finding {
  /** Подробность для отчёта: что именно не так. */
  detail: string;
  /** Элемент: роль/тег и доступное имя или текст, номера задач и числа заменены на #. */
  element: string;
  /** Детектор и правило: `axe:color-contrast`, `clip:horizontal`, `button:no-hover`… */
  rule: string;
}

interface Rect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/** Хелперы, которые ставятся в страницу один раз (`installHelpers`) и доступны детекторам в evaluate. */
interface AuditHelpers {
  /** Русский интерфейс: английские фразы словаря, которых в нём быть не должно; английский — null. */
  englishPhrases: Set<string> | null;
  clipFinding(el: HTMLElement): Finding | null;
  controlFindings(el: HTMLElement): Finding[];
  cutByParent(el: HTMLElement): number;
  describe(el: Element): string;
  isDisabled(el: Element): boolean;
  isShown(el: Element): boolean;
  untranslatedFinding(el: HTMLElement): Finding | null;
  visibleRect(el: Element): Rect;
}

declare global {
  interface Window {
    auditHelpers: AuditHelpers;
  }
}

/** Номера задач и числа в имени меняются от фикстуры к фикстуре сильнее, чем сам элемент. */
function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\b[A-Z][A-Z0-9]{0,9}-\d{1,9}\b/g, '#')
    .replace(/\d[\d.,:/]*/g, '#')
    .trim()
    .slice(0, 60);
}

// --- Выполняются в браузере: без замыканий и импортов, друг к другу — через window.auditHelpers. ---

function describe(el: Element): string {
  const role = el.getAttribute('role') ?? el.tagName.toLowerCase();
  const text = el instanceof HTMLElement ? el.innerText : (el.textContent ?? '');
  const name = el.getAttribute('aria-label') ?? el.getAttribute('title') ?? text;
  return `${role} "${name.trim().replace(/\s+/g, ' ').slice(0, 50)}"`;
}

/** Видимая часть элемента: пересечение с окном и всеми предками, которые обрезают содержимое. */
function visibleRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  const rect = {
    bottom: Math.min(r.bottom, window.innerHeight),
    left: Math.max(r.left, 0),
    right: Math.min(r.right, window.innerWidth),
    top: Math.max(r.top, 0),
  };
  for (let a = el.parentElement; a; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    const ar = a.getBoundingClientRect();
    rect.left = Math.max(rect.left, ar.left);
    rect.top = Math.max(rect.top, ar.top);
    rect.right = Math.min(rect.right, ar.right);
    rect.bottom = Math.min(rect.bottom, ar.bottom);
  }
  return rect;
}

function isShown(el: Element): boolean {
  const s = getComputedStyle(el);
  if (s.visibility === 'hidden' || s.display === 'none') return false;
  for (let a: Element | null = el; a; a = a.parentElement) {
    if (Number(getComputedStyle(a).opacity) < 0.1) return false;
  }
  const v = window.auditHelpers.visibleRect(el);
  return v.right - v.left >= 4 && v.bottom - v.top >= 4;
}

function isDisabled(el: Element): boolean {
  return el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';
}

/**
 * Строка мимо словаря в собственном тексте или подписи элемента: в английском UI — кириллица,
 * в русском — точное совпадение с английской фразой словаря.
 */
function untranslatedFinding(el: HTMLElement): Finding | null {
  const { describe: name, englishPhrases, isShown: shown } = window.auditHelpers;
  const own = [...el.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => (n.textContent ?? '').trim())
    .join(' ')
    .trim();
  const labels = [own, el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('placeholder')];
  let hit: string | null | undefined;
  if (englishPhrases) {
    hit = labels.find((label) => label && englishPhrases.has(label.trim()));
  } else {
    hit = /[А-Яа-яЁё][А-Яа-яЁё\s,.:-]*/.exec(labels.join(' '))?.[0];
  }
  if (!hit || el.closest('nextjs-portal') || !shown(el)) return null;
  return { detail: `«${hit.trim().slice(0, 40)}»`, element: name(el), rule: 'i18n:untranslated' };
}

/**
 * На сколько пикселей текст элемента уходит за правый край ближайшего (до 3 уровней) родителя, который обрезает
 * содержимое (`overflow: hidden/clip`) без многоточия и без подсказки. Прокручиваемые родители не в счёт:
 * карточка за краем доски не обрезана, её можно прокрутить.
 */
function cutByParent(el: HTMLElement): number {
  let parent = el.parentElement;
  for (let depth = 0; parent && depth < 3; depth += 1, parent = parent.parentElement) {
    const s = getComputedStyle(parent);
    if (/auto|scroll/.test(s.overflowX)) return 0;
    if (!/hidden|clip/.test(s.overflowX)) continue;
    if ((s.textOverflow === 'ellipsis' && !/flex|grid/.test(s.display)) || parent.hasAttribute('title')) return 0;
    return Math.max(0, el.getBoundingClientRect().right - parent.getBoundingClientRect().right);
  }
  return 0;
}

function clipFinding(el: HTMLElement): Finding | null {
  const { cutByParent: cut, describe: name, isShown: shown } = window.auditHelpers;
  const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
  // Полный текст по наведению даёт только title у самого элемента или его обёртки; aria-label предка (карточка-
  // кнопка) подсказку не показывает — раньше из-за него выпадало всё содержимое карточек.
  const tooltip = el.hasAttribute('title') || el.parentElement?.hasAttribute('title');
  if (!ownText || tooltip || el.closest('nextjs-portal') || !shown(el)) return null;
  const s = getComputedStyle(el);
  // text-overflow в flex/grid-контейнере не работает: `truncate` на строке «аватар + имя» режет без многоточия.
  const ellipsis = s.textOverflow === 'ellipsis' && !/flex|grid/.test(s.display);
  if (/hidden|clip/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && !ellipsis) {
    return { detail: `${el.scrollWidth}px текста в ${el.clientWidth}px`, element: name(el), rule: 'clip:horizontal' };
  }
  const beyond = cut(el);
  if (beyond > 1) {
    return { detail: `${Math.round(beyond)}px текста за краем родителя`, element: name(el), rule: 'clip:horizontal' };
  }
  const clamped = s.webkitLineClamp !== 'none' && s.webkitLineClamp !== '';
  if (/hidden|clip/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1 && !clamped) {
    return { detail: `${el.scrollHeight}px текста в ${el.clientHeight}px`, element: name(el), rule: 'clip:vertical' };
  }
  return null;
}

/** Курсор и перекрытие у одного контрола. Перекрыт — если не кликается ни одна из пяти точек видимой части. */
function controlFindings(el: HTMLElement): Finding[] {
  const { describe: name, isDisabled: disabled, visibleRect: visible } = window.auditHelpers;
  const cursor = getComputedStyle(el).cursor;
  const clickable = el.matches('button, a[href], [role=button], [role=link], [role=tab]');
  if (disabled(el)) {
    const looksActive = clickable && cursor === 'pointer' && getComputedStyle(el).pointerEvents !== 'none';
    return looksActive
      ? [{ detail: 'выключена, но курсор — рука', element: name(el), rule: 'button:disabled-looks-active' }]
      : [];
  }
  const findings: Finding[] = [];
  if (clickable && !['grab', 'move', 'pointer'].includes(cursor)) {
    findings.push({ detail: `cursor: ${cursor}`, element: name(el), rule: 'button:cursor' });
  }
  const v = visible(el);
  const points = [
    [0.5, 0.2],
    [0.5, 0.5],
    [0.5, 0.8],
    [0.2, 0.5],
    [0.8, 0.5],
  ];
  const tops = points.map(([fx, fy]) =>
    document.elementFromPoint(v.left + (v.right - v.left) * fx, v.top + (v.bottom - v.top) * fy)
  );
  if (tops.every((top) => top !== null && top !== el && !el.contains(top) && !top.contains(el))) {
    findings.push({ detail: `сверху ${name(tops[0]!)}`, element: name(el), rule: 'covered' });
  }
  return findings;
}

function collectStrings(value: unknown, out: Set<string>): Set<string> {
  if (typeof value === 'string') out.add(value.trim());
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, out));
  return out;
}

/** Все строки данных демо: сид спринта и план квартала демо — статусы и названия «из трекера». */
function demoDataStrings(): Set<string> {
  const seed = createDemoFixtureSeed();
  const quarter = { quarter: 4, year: 2026 } as const;
  // Без задач спринта статусы эпиков берутся из справочника демо-трекера — так в набор попадают все варианты;
  // живые статусы задач уже есть в сиде.
  const plan = buildDemoQuarterlyPlan(quarter, buildDemoQuarterlyPlanContent(quarter), seed.developers, {
    partsPerDay: 3,
    positions: [],
    sprints: [],
    tasks: [],
  });
  return collectStrings(plan, collectStrings(seed, new Set()));
}

/**
 * Английские фразы словаря, которых не должно быть в русском интерфейсе: у ключа есть отличающийся перевод,
 * это не шаблон с `{…}`, не заимствование, которое русский словарь сам где-то использует («Delivery»),
 * и не данные демо (статусы и названия из «трекера» английские по замыслу).
 */
function englishOnlyPhrases(): string[] {
  const en = flattenMessagesToDotMap(enMessages);
  const ru = flattenMessagesToDotMap(ruMessages);
  const ruValues = new Set(Object.values(ru).map((text) => text.trim()));
  const data = demoDataStrings();
  const phrases = Object.entries(en)
    .filter(([key, text]) => text !== ru[key] && /[A-Za-z]{2}/.test(text) && !text.includes('{'))
    .map(([, text]) => text.trim())
    .filter((text) => !ruValues.has(text) && !data.has(text));
  return [...new Set(phrases)];
}

async function installHelpers(page: Page, language: 'en' | 'ru'): Promise<void> {
  const helpers = {
    clipFinding,
    controlFindings,
    cutByParent,
    describe,
    isDisabled,
    isShown,
    untranslatedFinding,
    visibleRect,
  };
  const source = Object.entries(helpers)
    .map(([key, fn]) => `${key}: ${fn.toString()}`)
    .join(',\n');
  const phrases = language === 'ru' ? `new Set(${JSON.stringify(englishOnlyPhrases())})` : 'null';
  await page.addScriptTag({ content: `window.auditHelpers = {\n${source},\nenglishPhrases: ${phrases}\n};` });
}

// --- Детекторы ---

async function axeFindings(page: Page): Promise<Finding[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('nextjs-portal')
    .analyze();
  const findings: Finding[] = [];
  for (const violation of result.violations) {
    for (const node of violation.nodes) {
      const element = await page
        .locator(node.target.join(' '))
        .first()
        .evaluate((el) => window.auditHelpers.describe(el))
        .catch(() => node.html.slice(0, 60));
      findings.push({ detail: `${violation.impact ?? ''}: ${violation.help}`, element, rule: `axe:${violation.id}` });
    }
  }
  return findings;
}

function domFindings(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const { clipFinding: clip, controlFindings: control, isShown: shown, untranslatedFinding: untranslated } =
      window.auditHelpers;
    const findings: Finding[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      for (const finding of [clip(el), untranslated(el)]) if (finding) findings.push(finding);
    }
    const controls = 'button, a[href], input, select, textarea, [role=button], [role=checkbox], [role=tab], [role=link]';
    for (const el of document.querySelectorAll<HTMLElement>(controls)) {
      if (shown(el) && !el.closest('nextjs-portal')) findings.push(...control(el));
    }
    return findings;
  });
}

/** Стили, по которым видно наведение: фон, цвет, рамка, тень, прозрачность — у кнопки и её содержимого. */
function hoverSignature(el: Element): string {
  return [el, ...el.querySelectorAll('*')]
    .slice(0, 12)
    .map((node) => {
      const s = getComputedStyle(node);
      return [s.backgroundColor, s.color, s.borderColor, s.boxShadow, s.opacity, s.textDecorationLine, s.fill, s.stroke].join('|');
    })
    .join(';');
}

/**
 * По одному экземпляру на каждый вид кнопки (тег + классы): одинаковые классы ведут себя одинаково,
 * а наводить на сотни карточек долго. Перетаскиваемое (курсор grab) отвечает на наведение курсором
 * и ручками рядом с собой, а не своим фоном, — не проверяется.
 */
function markHoverTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const { isDisabled: disabled } = window.auditHelpers;
    const seen = new Set<string>();
    const picked: string[] = [];
    document.querySelectorAll<HTMLElement>('button, [role=button]').forEach((el, index) => {
      const r = el.getBoundingClientRect();
      const inView = r.width > 4 && r.height > 4 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
      const draggable = ['grab', 'move'].includes(getComputedStyle(el).cursor);
      const kind = `${el.tagName}.${el.className}`;
      if (!inView || disabled(el) || draggable || seen.has(kind) || el.closest('nextjs-portal')) return;
      seen.add(kind);
      el.dataset.auditHover = String(index);
      picked.push(String(index));
    });
    return picked;
  });
}

/** Наводим по-настоящему и сравниваем вычисленные стили до и после. */
async function hoverFindings(page: Page): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const id of await markHoverTargets(page)) {
    const target = page.locator(`[data-audit-hover="${id}"]`);
    await page.mouse.move(0, 0);
    const before = await target.evaluate(hoverSignature);
    const hovered = await target
      .hover({ timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    if (hovered && before === (await target.evaluate(hoverSignature))) {
      findings.push({
        detail: 'наведение не меняет ни фон, ни цвет, ни рамку',
        element: await target.evaluate((el) => window.auditHelpers.describe(el)),
        rule: 'button:no-hover',
      });
    }
  }
  await page.mouse.move(0, 0);
  return findings;
}

/** Анимации и переходы — в конечное состояние: иначе контраст и наведение меряются посреди появления. */
const FREEZE_MOTION = `*, *::before, *::after {
  animation-duration: 0s !important; animation-delay: 0s !important;
  transition: none !important;
}`;

/** Все детекторы по текущему состоянию страницы. Страницу после аудита не переиспользовать. */
export async function collectFindings(page: Page, language: 'en' | 'ru' = 'en'): Promise<Finding[]> {
  await page.addStyleTag({ content: FREEZE_MOTION });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await installHelpers(page, language);
  const findings = [...(await axeFindings(page)), ...(await domFindings(page)), ...(await hoverFindings(page))];
  return findings.map((finding) => ({ ...finding, element: normalizeName(finding.element) }));
}
