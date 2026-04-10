import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DocumentItem } from '../lib/types';
import { documentsApi } from '../lib/api';
import { Button } from './ui/button';
import { getFocusableElements, isPdfDocument } from './helper';

type DocumentPreviewDialogProps = {
  doc: DocumentItem;
  onClose: () => void;
};

export function DocumentPreviewDialog({ doc, onClose }: DocumentPreviewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pdf = isPdfDocument(doc);

  useEffect(() => {
    if (!pdf) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    const tid = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      void documentsApi
        .fetchFileBlob(doc.id, { inline: true })
        .then((b) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(b);
          setBlobUrl(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setError('Could not load preview.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdf, doc.id]);

  useLayoutEffect(() => {
    previousActiveElementRef.current = document.activeElement;
    const container = dialogRef.current;
    if (!container) return;
    const trapRoot = container;

    const getFocusable = () => getFocusableElements(trapRoot);

    const focusInitial = () => {
      const list = getFocusable();
      const target = list[0] ?? trapRoot;
      if (target === trapRoot) {
        if (!trapRoot.hasAttribute('tabindex')) {
          trapRoot.setAttribute('tabindex', '-1');
        }
      }
      target.focus();
    };

    queueMicrotask(() => focusInitial());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const list = getFocusable();
      if (list.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const idx = active ? list.indexOf(active) : -1;

      if (idx === -1) {
        e.preventDefault();
        list[0]?.focus();
        return;
      }

      if (e.shiftKey) {
        if (idx === 0) {
          e.preventDefault();
          list[list.length - 1]?.focus();
        }
      } else if (idx === list.length - 1) {
        e.preventDefault();
        list[0]?.focus();
      }
    }

    function onFocusIn(e: FocusEvent) {
      const target = e.target as Node | null;
      if (!target || !trapRoot.contains(target)) {
        const list = getFocusable();
        list[0]?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn, true);

      const prev = previousActiveElementRef.current;
      if (prev instanceof HTMLElement && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, [doc.id, onClose]);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
    >
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative z-101 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <h2
            id="document-preview-title"
            className="min-w-0 truncate text-sm font-semibold text-zinc-100"
          >
            {doc.originalName}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void documentsApi.downloadToDevice(doc.id, doc.originalName)}
            >
              Download
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </header>
        <div className="min-h-[min(50vh,420px)] flex-1 overflow-auto bg-zinc-950 p-2">
          {pdf && loading ? (
            <p className="p-8 text-center text-sm text-zinc-400">Loading preview…</p>
          ) : null}
          {pdf && error ? (
            <p className="p-8 text-center text-sm text-rose-300">{error}</p>
          ) : null}
          {pdf && blobUrl && !loading && !error ? (
            <iframe
              title={doc.originalName}
              src={blobUrl}
              className="h-[min(75vh,720px)] w-full rounded-lg border border-zinc-800 bg-zinc-900"
            />
          ) : null}
          {!pdf ? (
            <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
              <p className="max-w-md text-sm text-zinc-400">
                Inline preview is not available for Word documents. Download the file to open it in
                Word or another compatible app.
              </p>
              <Button
                type="button"
                onClick={() => void documentsApi.downloadToDevice(doc.id, doc.originalName)}
              >
                Download
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
