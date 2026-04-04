import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DocumentItem } from '../lib/types';
import { documentsApi } from '../lib/api';
import { Button } from './ui/button';

function isPdfDocument(doc: DocumentItem): boolean {
  return (
    doc.mimeType === 'application/pdf' || doc.originalName.toLowerCase().endsWith('.pdf')
  );
}

type DocumentPreviewDialogProps = {
  doc: DocumentItem;
  onClose: () => void;
};

export function DocumentPreviewDialog({ doc, onClose }: DocumentPreviewDialogProps) {
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
    >
      <button
        type="button"
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
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
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
