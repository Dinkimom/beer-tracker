'use client';

import type { QuarterlyPlanLink } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useEffect, useRef, useState } from 'react';

import { ZIndex } from '@/constants';
import { LinkArrowDeleteButton } from '@/features/swimlane/components/task-arrows/LinkArrowDeleteButton';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { draftMarkOf } from '../quarterlyPlanBoardModel';

/** Вынос стрелки от края полосы до поворота. */
const STUB_PX = 10;
/** На сколько стрелка отступает от строки полосы, когда обходит её сверху или снизу. */
const DETOUR_PX = 14;
/** Зазор между остриём и полосой. */
const TIP_GAP_PX = 2;
/** Наименьший просвет между полосами, в который стрелка входит одним поворотом: место под остриё. */
const MIN_DIRECT_GAP_PX = 8;
const DELETE_BUTTON_PX = 20;

/**
 * Вид стрелки — как у связей на доске спринта: приглушённая в покое, оранжевая при нарушенном порядке.
 * У полосы под курсором ярче и обычные связи, и нарушенные.
 */
type LinkTone = 'danger' | 'idle' | 'preview' | 'strong' | 'violated' | 'violatedStrong';

const TONE_STROKE_CLASS: Record<LinkTone, string> = {
  danger: 'stroke-red-500',
  idle: 'stroke-gray-300 dark:stroke-gray-600',
  preview: 'stroke-blue-400',
  strong: 'stroke-gray-500 dark:stroke-gray-300',
  violated: 'stroke-orange-300 dark:stroke-orange-700',
  violatedStrong: 'stroke-orange-500',
};
const TONES = Object.keys(TONE_STROKE_CLASS) as LinkTone[];

interface LinkPath {
  d: string;
  fromId: string;
  id: string;
  /** Начало стрелки у полосы-предшественника: здесь стоит кнопка удаления. */
  start: { x: number; y: number };
  toId: string;
}

interface Measured {
  paths: LinkPath[];
  preview: string | null;
}

interface QuarterlyPlanLinksLayerProps {
  links: readonly QuarterlyPlanLink[];
  /** Зависимости с нарушенным порядком. */
  violatedLinkIds: ReadonlySet<string>;
}

interface Box {
  /** Половина высоты полосы; у курсора — ноль. */
  half: number;
  left: number;
  right: number;
  y: number;
}

/**
 * Ломаная от правого края полосы-предшественника к левому краю зависимой. Если зависимая начинается
 * правее — один поворот от правого края. Если просвета между полосами нет (соседние недели или
 * сроки пересекаются), стрелка выходит из нижнего или верхнего края предшественника над точкой входа
 * и тоже поворачивает один раз. В обход строки она идёт, только когда зависимая стоит целиком левее.
 */
function buildLinkPath(from: Box, to: Box): string {
  const x1 = from.right;
  const x2 = to.left - TIP_GAP_PX;
  const gap = x2 - x1;
  if (gap >= MIN_DIRECT_GAP_PX) {
    return `M ${x1} ${from.y} H ${x1 + Math.min(STUB_PX, gap / 2)} V ${to.y} H ${x2}`;
  }
  const dropX = x2 - STUB_PX;
  if (Math.abs(to.y - from.y) > from.half && dropX >= from.left + STUB_PX && dropX <= x1) {
    return `M ${dropX} ${from.y + Math.sign(to.y - from.y) * from.half} V ${to.y} H ${x2}`;
  }
  const detourY = to.y > from.y ? to.y - DETOUR_PX : to.y + DETOUR_PX;
  return `M ${x1} ${from.y} H ${x1 + STUB_PX} V ${detourY} H ${x2 - STUB_PX} V ${to.y} H ${x2}`;
}

function boxOf(element: Element, origin: DOMRect): Box {
  const rect = element.getBoundingClientRect();
  return {
    half: rect.height / 2,
    left: rect.left - origin.left,
    right: rect.right - origin.left,
    y: rect.top + rect.height / 2 - origin.top,
  };
}

/**
 * Стрелки блокирующих зависимостей и работа с ними — как на доске спринта. Стрелка идёт от полосы,
 * которая должна закончиться, к полосе, которая её ждёт; в покое приглушена, у полосы под курсором
 * её связи ярче, нарушенный порядок — оранжевым. С инструментом «Связь» от выбранной полосы
 * к курсору тянется пунктир, а у каждой связи есть кнопка удаления.
 * Координаты берутся из разметки каждый кадр: стрелки идут за полосами при перетаскивании
 * и при плавном росте строк. Связь со скрытой полосой (свёрнутая команда) не рисуется.
 */
export function QuarterlyPlanLinksLayer({ links, violatedLinkIds }: QuarterlyPlanLinksLayerProps) {
  const { canLinkTo, draftMarks, linking, onLinkDelete } = useQuarterlyPlanBoard();
  const svgRef = useRef<SVGSVGElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [measured, setMeasured] = useState<Measured>({ paths: [], preview: null });
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);
  const [deleteHoverId, setDeleteHoverId] = useState<string | null>(null);
  const { sourceId } = linking;

  // Полоса под курсором: её связи ярче; при выборе цели пунктир примагничивается к ней.
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return undefined;
    const track = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      const bar = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-quarter-bar]') : null;
      setHoveredBarId(bar?.dataset.quarterBar ?? null);
    };
    const leave = () => setHoveredBarId(null);
    container.addEventListener('pointermove', track);
    container.addEventListener('pointerleave', leave);
    return () => {
      container.removeEventListener('pointermove', track);
      container.removeEventListener('pointerleave', leave);
    };
  }, []);

  const snapTargetId = sourceId && hoveredBarId && canLinkTo(hoveredBarId) ? hoveredBarId : null;

  useEffect(() => {
    if (links.length === 0 && !sourceId) return undefined;
    let frame = 0;
    let lastKey = '';
    const measure = () => {
      const svg = svgRef.current;
      const container = svg?.parentElement;
      if (svg && container) {
        const origin = svg.getBoundingClientRect();
        const bar = (id: string) => container.querySelector(`[data-quarter-bar="${id}"]`);
        const paths = links.flatMap((link): LinkPath[] => {
          const fromEl = bar(link.fromId);
          const toEl = bar(link.toId);
          if (!fromEl || !toEl) return [];
          const from = boxOf(fromEl, origin);
          return [
            {
              d: buildLinkPath(from, boxOf(toEl, origin)),
              fromId: link.fromId,
              id: link.id,
              start: { x: from.right, y: from.y },
              toId: link.toId,
            },
          ];
        });
        const preview = buildPreview({ bar, origin, pointer: pointerRef.current, snapTargetId, sourceId });
        const key = `${preview}#${paths.map((path) => `${path.id}${path.d}`).join('|')}`;
        if (key !== lastKey) {
          lastKey = key;
          setMeasured({ paths, preview });
        }
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [links, snapTargetId, sourceId]);

  const toneOf = (path: LinkPath): LinkTone => {
    // Связь из черновика агента (QM9): новая — синяя, убранная — красная; обе пунктиром.
    const draftMark = draftMarkOf(draftMarks, path.id);
    if (path.id === deleteHoverId || draftMark === 'removed') return 'danger';
    if (draftMark) return 'preview';
    const hovered = path.fromId === hoveredBarId || path.toId === hoveredBarId;
    if (violatedLinkIds.has(path.id)) return hovered ? 'violatedStrong' : 'violated';
    return hovered ? 'strong' : 'idle';
  };
  const visible = links.length > 0 || sourceId !== null;

  return (
    <>
      <svg
        ref={svgRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        // Под полосами, как связи в покое на доске спринта: стрелка не перечёркивает подписи.
        style={{ zIndex: ZIndex.contentOverlay }}
      >
        <defs>
          {TONES.map((tone) => (
            <marker
              key={tone}
              id={`quarter-link-head-${tone}`}
              markerHeight={10}
              markerUnits="userSpaceOnUse"
              markerWidth={8}
              orient="auto"
              refX={6}
              refY={5}
            >
              <path
                className={TONE_STROKE_CLASS[tone]}
                d="M 1.5 1 L 6 5 L 1.5 9"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </marker>
          ))}
        </defs>
        {visible
          ? measured.paths.map((path) => {
              const tone = toneOf(path);
              return (
                <path
                  key={path.id}
                  className={`[transition:stroke_0.35s_cubic-bezier(0.4,0,0.2,1)] ${TONE_STROKE_CLASS[tone]}`}
                  d={path.d}
                  fill="none"
                  markerEnd={`url(#quarter-link-head-${tone})`}
                  strokeDasharray={draftMarkOf(draftMarks, path.id) ? '6 4' : undefined}
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                />
              );
            })
          : null}
        {sourceId && measured.preview ? (
          <path
            className={TONE_STROKE_CLASS.preview}
            d={measured.preview}
            fill="none"
            markerEnd="url(#quarter-link-head-preview)"
            strokeDasharray="8 6"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        ) : null}
      </svg>
      {/* Кнопки удаления — у начала каждой стрелки, пока включён инструмент «Связь». */}
      {linking.armed
        ? measured.paths.map((path) => (
            <div
              key={path.id}
              className="pointer-events-none absolute left-0 top-0"
              style={{ zIndex: ZIndex.contentInteractive + 2 }}
            >
              <LinkArrowDeleteButton
                fromTaskId={path.fromId}
                style={{ left: path.start.x + 2, top: path.start.y - DELETE_BUTTON_PX / 2 }}
                onDelete={() => onLinkDelete(path.id)}
                onHoverChange={(hovered) => setDeleteHoverId(hovered ? path.id : null)}
                onSourceHoverEnd={() => undefined}
              />
            </div>
          ))
        : null}
    </>
  );
}

/**
 * Пунктир от выбранной полосы: к цели под курсором (острие — у той, что стоит позже) или к самому
 * курсору. Курсор левее источника — стрелка разворачивается остриём к источнику.
 */
function buildPreview(input: {
  bar: (id: string) => Element | null;
  origin: DOMRect;
  pointer: { x: number; y: number } | null;
  snapTargetId: string | null;
  sourceId: string | null;
}): string | null {
  const sourceEl = input.sourceId ? input.bar(input.sourceId) : null;
  if (!sourceEl) return null;
  const source = boxOf(sourceEl, input.origin);
  const targetEl = input.snapTargetId ? input.bar(input.snapTargetId) : null;
  if (targetEl) {
    const target = boxOf(targetEl, input.origin);
    return target.right <= source.left ? buildLinkPath(target, source) : buildLinkPath(source, target);
  }
  if (!input.pointer) return null;
  const x = input.pointer.x - input.origin.left;
  const cursor = { half: 0, left: x, right: x, y: input.pointer.y - input.origin.top };
  return x < source.left ? buildLinkPath(cursor, source) : buildLinkPath(source, cursor);
}
