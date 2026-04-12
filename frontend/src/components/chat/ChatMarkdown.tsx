import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
import { MarkdownErrorBoundary } from './MarkdownErrorBoundary';

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-4 border-b border-zinc-700/80 pb-1 text-lg font-semibold text-zinc-50 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold text-zinc-100 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold text-zinc-100 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1.5 mt-2 text-sm font-medium text-zinc-200 first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-zinc-200">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-zinc-200 last:mb-0 marker:text-zinc-500">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-zinc-200 last:mb-0 marker:text-zinc-500">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-50">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-100">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-orange-300 underline decoration-orange-400/50 underline-offset-2 hover:text-orange-200"
      target="_blank"
      rel="noreferrer noopener"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-orange-400/40 pl-3 text-zinc-400 italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-700" />,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (isBlock) {
      return (
        <code className={cn('block w-full whitespace-pre font-mono text-[13px] text-zinc-200', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[0.85em] text-orange-200/95"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-zinc-700/70 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-zinc-700/80 last:mb-0">
      <table className="w-full min-w-[240px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-950/90">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-zinc-700/80">{children}</tbody>,
  tr: ({ children }) => <tr className="border-zinc-700/60">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-zinc-600/80 px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-zinc-700/60 px-2.5 py-2 text-zinc-300">{children}</td>
  ),
};

type ChatMarkdownProps = {
  content: string;
  className?: string;
};

function PlainMarkdownFallback({ content, className }: ChatMarkdownProps) {
  return (
    <pre
      className={cn(
        'whitespace-pre-wrap wrap-break-word font-sans text-sm leading-relaxed text-zinc-200',
        className,
      )}
    >
      {content}
    </pre>
  );
}

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  if (content.length === 0) {
    return <p className={cn('text-sm italic text-zinc-500', className)}>No reply content.</p>;
  }

  if (!content.trim()) {
    return <PlainMarkdownFallback content={content} className={className} />;
  }

  return (
    <MarkdownErrorBoundary
      resetKey={content}
      fallback={<PlainMarkdownFallback content={content} className={className} />}
    >
      <div className={cn('chat-markdown max-w-none text-sm leading-relaxed', className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}
