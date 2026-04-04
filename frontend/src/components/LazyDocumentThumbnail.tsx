import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DocumentItem } from '../lib/types';
import { documentsApi } from '../lib/api';
import { cn } from '../lib/utils';

function isPdfDocument(doc: DocumentItem): boolean {
  return (
    doc.mimeType === 'application/pdf' || doc.originalName.toLowerCase().endsWith('.pdf')
  );
}

function wordLabel(doc: DocumentItem): string {
  const n = doc.originalName.toLowerCase();
  if (n.endsWith('.docx')) return 'DOCX';
  if (n.endsWith('.doc')) return 'DOC';
  if (doc.mimeType.includes('word')) return 'DOC';
  return 'FILE';
}

type LazyDocumentThumbnailProps = {
  doc: DocumentItem;
  className?: string;
};

export function LazyDocumentThumbnail({ doc, className }: LazyDocumentThumbnailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);
  const [inView, setInView] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const pdf = isPdfDocument(doc);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: '100px', threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !inView || fetchedRef.current) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    fetchedRef.current = true;

    const startId = window.setTimeout(() => {
      setPhase('loading');
      void documentsApi
        .fetchFileBlob(doc.id, { inline: true })
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
          setPhase('ready');
        })
        .catch(() => {
          if (!cancelled) {
            fetchedRef.current = false;
            setPhase('error');
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [inView, pdf, doc.id]);

  if (!pdf) {
    return (
      <div
        ref={rootRef}
        className={cn(
          'flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-700 bg-linear-to-br from-sky-900/40 to-zinc-900 text-[0.65rem] font-bold tracking-tight text-sky-200/90',
          className,
        )}
        title={doc.originalName}
      >
        <FileText className="mb-0.5 h-3.5 w-3.5 opacity-80" aria-hidden />
        {wordLabel(doc)}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950',
        className,
      )}
      title={doc.originalName}
    >
      {phase === 'loading' || phase === 'idle' ? (
        <div className="flex h-full w-full items-center justify-center text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        </div>
      ) : null}
      {phase === 'error' ? (
        <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[0.6rem] text-zinc-500">
          PDF
        </div>
      ) : null}
      {phase === 'ready' && blobUrl ? (
        <div className="pointer-events-none absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-[0.5]">
          <iframe
            title=""
            src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="h-full w-full border-0 opacity-95"
          />
        </div>
      ) : null}
    </div>
  );
}
