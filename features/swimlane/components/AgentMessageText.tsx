'use client';

import { Children, Fragment, type ReactNode, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useTrackerWebUrlContext } from '@/contexts/IssueTrackerProviderKindContext';
import { splitStickyNoteTextByIssueKeys } from '@/lib/comments/stickyNoteIssueKeys';
import { splitStickyNoteTextByUrls } from '@/lib/comments/stickyNoteLinks';
import { issueTrackerIssueWebUrlFromBase } from '@/lib/issueTrackerProvider/issueTrackerUi';

/** На цветном пузыре — белое подчёркивание, на обычном фоне — синяя ссылка. */
const LINK_CLASS = {
  bubble:
    'cursor-pointer font-medium underline decoration-white/50 underline-offset-2 transition-colors hover:decoration-white',
  plain:
    'cursor-pointer font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:decoration-blue-400',
} as const;

type LinkSurface = keyof typeof LINK_CLASS;

function renderLink(label: ReactNode, href: string, key: string, surface: LinkSurface): ReactNode {
  return (
    <a key={key} className={LINK_CLASS[surface]} href={href} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  );
}

function renderIssueKeys(
  value: string,
  keyPrefix: string,
  issueHref: ((key: string) => string) | null,
  surface: LinkSurface
): ReactNode {
  if (!issueHref) {
    return value;
  }
  return splitStickyNoteTextByIssueKeys(value).map((segment, index) =>
    segment.type === 'text' ? (
      <Fragment key={`${keyPrefix}-${index}`}>{segment.value}</Fragment>
    ) : (
      renderLink(segment.key, issueHref(segment.key), `${keyPrefix}-${index}`, surface)
    )
  );
}

/** Голый текст: ключи задач ведут в трекер, URL кликабельны. */
function renderPlainText(
  text: string,
  keyPrefix: string,
  issueHref: ((key: string) => string) | null,
  surface: LinkSurface
): ReactNode {
  return splitStickyNoteTextByUrls(text).map((segment, index) =>
    segment.type === 'url' ? (
      renderLink(segment.raw, segment.href, `${keyPrefix}-url-${index}`, surface)
    ) : (
      <Fragment key={`${keyPrefix}-text-${index}`}>
        {renderIssueKeys(segment.value, `${keyPrefix}-text-${index}`, issueHref, surface)}
      </Fragment>
    )
  );
}

const REMARK_PLUGINS = [remarkGfm];

const CODE_CLASS = {
  bubble: 'rounded bg-white/20 px-1 font-mono text-[12px]',
  plain: 'rounded bg-gray-500/[0.12] px-1 font-mono text-[12px] dark:bg-white/[0.1]',
} as const;

/**
 * Текст реплики в чате с агентом — markdown с GFM (жирный, курсив, ~~зачёркнутый~~, списки и чек-листы,
 * код, заголовки, цитаты, таблицы, ссылки).
 * В тексте ключи задач ведут в трекер, голые URL кликабельны; HTML из markdown не рендерится.
 * Переносы строк внутри абзаца сохраняются, как в чате.
 */
export function AgentMessageText({ surface = 'bubble', text }: { surface?: LinkSurface; text: string }) {
  const { kind, webBaseUrl } = useTrackerWebUrlContext();
  const components = useMemo((): Components => {
    const issueHref = webBaseUrl.trim()
      ? (issueKey: string) => issueTrackerIssueWebUrlFromBase(kind, webBaseUrl, issueKey)
      : null;
    const linkify = (children: ReactNode) =>
      Children.map(children, (child, index) =>
        typeof child === 'string' ? renderPlainText(child, `md-${index}`, issueHref, surface) : child
      );
    return {
      a: ({ children, href }) =>
        href ? renderLink(children ?? href, href, href, surface) : <span>{children}</span>,
      blockquote: ({ children }) => (
        <blockquote className="mt-1.5 border-l-2 border-current/30 pl-2 opacity-90 first:mt-0">{children}</blockquote>
      ),
      code: ({ children }) => <code className={CODE_CLASS[surface]}>{children}</code>,
      del: ({ children }) => <del className="opacity-70">{linkify(children)}</del>,
      em: ({ children }) => <em>{linkify(children)}</em>,
      // Ступеньки от базовых 13px чата: в узкой ленте заголовок не должен кричать.
      h1: ({ children }) => (
        <p className="mt-3 text-[16px] font-semibold leading-snug first:mt-0">{linkify(children)}</p>
      ),
      h2: ({ children }) => (
        <p className="mt-2.5 text-[14.5px] font-semibold leading-snug first:mt-0">{linkify(children)}</p>
      ),
      h3: ({ children }) => <p className="mt-2 font-semibold first:mt-0">{linkify(children)}</p>,
      h4: ({ children }) => <p className="mt-1.5 font-medium first:mt-0">{linkify(children)}</p>,
      // Пункт чек-листа «- [x]»: галочка только для чтения, отмечают на доске.
      input: ({ checked }) => (
        <input
          checked={Boolean(checked)}
          className="mr-1.5 h-3 w-3 align-[-1px] accent-green-600"
          disabled
          readOnly
          type="checkbox"
        />
      ),
      li: ({ children, className }) => (
        <li className={className?.includes('task-list-item') ? 'list-none' : undefined}>{linkify(children)}</li>
      ),
      ol: ({ children }) => <ol className="mt-1 list-decimal space-y-0.5 pl-5 first:mt-0">{children}</ol>,
      p: ({ children }) => <p className="mt-1.5 whitespace-pre-wrap first:mt-0">{linkify(children)}</p>,
      pre: ({ children }) => (
        <pre className="mt-1.5 overflow-x-auto whitespace-pre rounded-md bg-gray-500/[0.08] p-2 first:mt-0 [&_code]:bg-transparent [&_code]:p-0">
          {children}
        </pre>
      ),
      strong: ({ children }) => <strong className="font-semibold">{linkify(children)}</strong>,
      table: ({ children }) => (
        <div className="mt-1.5 overflow-x-auto first:mt-0">
          <table className="border-collapse text-[12px]">{children}</table>
        </div>
      ),
      td: ({ children }) => <td className="border border-current/20 px-1.5 py-0.5">{linkify(children)}</td>,
      th: ({ children }) => (
        <th className="border border-current/20 px-1.5 py-0.5 text-left font-semibold">{linkify(children)}</th>
      ),
      ul: ({ children, className }) => (
        <ul
          className={`mt-1 space-y-0.5 first:mt-0 ${className?.includes('contains-task-list') ? 'pl-1' : 'list-disc pl-5'}`}
        >
          {children}
        </ul>
      ),
    };
  }, [kind, surface, webBaseUrl]);

  return (
    <ReactMarkdown components={components} remarkPlugins={REMARK_PLUGINS}>
      {text}
    </ReactMarkdown>
  );
}
