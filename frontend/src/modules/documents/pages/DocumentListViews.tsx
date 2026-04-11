import { Download, Eye, FileText, MessageSquare, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { LazyDocumentThumbnail } from '../../../components/LazyDocumentThumbnail';
import { cn } from '../../../lib/utils';
import type { DocumentItem } from '../../../lib/types';
import { formatBytes, formatShortDate, statusVariant } from './helper';
import { COMPLETED_STATUS } from './constants';

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-800/90 bg-zinc-900/50 px-4 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,.04)]',
        accent && 'border-orange-500/25 ring-1 ring-orange-500/15',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-600">{hint}</p> : null}
    </div>
  );
}

export function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/30 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-500">
        <FileText className="h-7 w-7" strokeWidth={1.5} aria-hidden />
      </div>
      <h3 className="text-lg font-medium text-zinc-200">No documents yet</h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Go to the home page and drop a PDF or Word file into the upload area to add your first
        document.
      </p>
      <Link to="/" className={cn(buttonVariants(), 'mt-6 inline-flex gap-2')}>
        Upload from home
      </Link>
    </div>
  );
}

export function DocumentTableRow({
  doc,
  onPreview,
  onDownload,
  onDelete,
  deletePending,
}: {
  doc: DocumentItem;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <tr className="bg-zinc-900/20 transition-colors hover:bg-zinc-800/30">
      <td className="px-3 py-3 align-middle">
        <button
          type="button"
          onClick={onPreview}
          className="inline-block cursor-pointer rounded-md border-0 bg-transparent p-0 ring-offset-2 ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          aria-label={`Preview ${doc.originalName}`}
        >
          <LazyDocumentThumbnail key={doc.id} doc={doc} />
        </button>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="hidden h-4 w-4 shrink-0 text-zinc-500 sm:block" aria-hidden />
          <span className="min-w-0 truncate font-medium text-zinc-100">{doc.originalName}</span>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
      </td>
      <td className="hidden px-3 py-3 align-middle text-zinc-400 tabular-nums lg:table-cell">
        {formatBytes(doc.size)}
      </td>
      <td className="hidden px-3 py-3 align-middle text-zinc-500 tabular-nums xl:table-cell">
        {formatShortDate(doc.createdAt)}
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {doc.status === COMPLETED_STATUS ? (
            <Link
              to={`/documents/${doc.id}/chat`}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'text-zinc-300',
              )}
              title="Chat with document"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="sr-only">Chat</span>
            </Link>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-zinc-300"
            onClick={onPreview}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">Preview</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-zinc-300"
            onClick={onDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            onClick={onDelete}
            disabled={deletePending}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function DocumentMobileCard({
  doc,
  onPreview,
  onDownload,
  onDelete,
  deletePending,
}: {
  doc: DocumentItem;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPreview}
          className="shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0 ring-offset-2 ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          aria-label={`Preview ${doc.originalName}`}
        >
          <LazyDocumentThumbnail key={doc.id} doc={doc} />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <p className="font-medium leading-snug text-zinc-100">{doc.originalName}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
              <span className="text-xs text-zinc-500 tabular-nums">{formatBytes(doc.size)}</span>
              <span className="text-xs text-zinc-600 tabular-nums">
                {formatShortDate(doc.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {doc.status === COMPLETED_STATUS ? (
              <Link
                to={`/documents/${doc.id}/chat`}
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-1.5')}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </Link>
            ) : null}
            <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={onPreview}>
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onDelete}
              disabled={deletePending}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
