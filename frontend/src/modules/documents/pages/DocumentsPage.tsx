import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, FolderPlus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { DocumentPreviewDialog } from '../../../components/DocumentPreviewDialog';
import { Input } from '../../../components/ui/input';
import { documentsApi } from '../../../lib/api';
import type { DocumentItem } from '../../../lib/types';
import {
  DocumentMobileCard,
  DocumentTableRow,
  EmptyLibrary,
  StatCard,
} from './DocumentListViews';
import { filterDocumentsByName } from './helper';

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const [uploadSuccessBanner, setUploadSuccessBanner] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [downloadSuccessBanner, setDownloadSuccessBanner] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    const state = location.state as { uploadSuccess?: boolean } | undefined;
    if (!state?.uploadSuccess) return;
    const path = location.pathname;
    const id = window.setTimeout(() => {
      setUploadSuccessBanner(true);
      navigate(path, { replace: true, state: {} });
    }, 0);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!uploadSuccessBanner) return;
    const t = window.setTimeout(() => setUploadSuccessBanner(false), 5000);
    return () => window.clearTimeout(t);
  }, [uploadSuccessBanner]);

  useEffect(() => {
    if (!downloadSuccessBanner) return;
    const t = window.setTimeout(() => setDownloadSuccessBanner(false), 5000);
    return () => window.clearTimeout(t);
  }, [downloadSuccessBanner]);

  const handleDownload = useCallback(async (documentId: string, originalName: string) => {
    setLibraryError(null);
    setDownloadSuccessBanner(false);
    try {
      await documentsApi.downloadToDevice(documentId, originalName);
      setDownloadSuccessBanner(true);
    } catch (error) {
      console.error('[DocumentsPage] download failed:', error);
      setLibraryError('Could not download the document. Please try again.');
    }
  }, []);

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.remove,
    onMutate: () => {
      setLibraryError(null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      console.error('[DocumentsPage] delete failed:', error);
      setLibraryError('Could not delete the document. Please try again.');
    },
  });

  const docs = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const filtered = useMemo(
    () => filterDocumentsByName(docs, filter),
    [docs, filter],
  );

  return (
    <div className="space-y-8">
      {previewDoc ? (
        <DocumentPreviewDialog
          key={previewDoc.id}
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      ) : null}

      {uploadSuccessBanner ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          Document uploaded. It may show as processing until indexing finishes.
        </div>
      ) : null}

      {downloadSuccessBanner ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          Download started — check your downloads folder if the file does not open automatically.
        </div>
      ) : null}

      {libraryError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {libraryError}
        </div>
      ) : null}

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Document library</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Upload new files from the home page, then preview, download, or remove them here.
          Libraries and groups will arrive when the API supports them.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total documents" value={String(docs.length)} />
        <StatCard
          label="Libraries"
          value="0"
          hint="Create groups when backend support lands"
        />
      </div>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/20">
              <BookMarked className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Libraries</h2>
              <p className="text-xs text-zinc-500">Group related documents (coming with API support)</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled
            title="Requires backend support for libraries"
          >
            <FolderPlus className="h-4 w-4" />
            New library
          </Button>
        </div>
        <p className="mt-4 rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/30 px-4 py-8 text-center text-sm text-zinc-500">
          No libraries yet. You will create named collections here to bundle PDFs and Word files for
          search and sharing.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">All documents</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search by file name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 border-zinc-800 bg-zinc-950/50 pl-9 text-zinc-100 placeholder:text-zinc-600"
              aria-label="Filter documents by name"
            />
          </div>
        </div>

        {documentsQuery.isLoading ? (
          <p className="text-sm text-zinc-400">Loading documents...</p>
        ) : null}
        {documentsQuery.isError ? (
          <p className="text-sm text-rose-300">Failed to load documents.</p>
        ) : null}

        {!documentsQuery.isLoading && !documentsQuery.isError && docs.length === 0 ? (
          <EmptyLibrary />
        ) : null}

        {!documentsQuery.isLoading && !documentsQuery.isError && docs.length > 0 && filtered.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/30 py-10 text-center text-sm text-zinc-500">
            No files match &ldquo;{filter.trim()}&rdquo;.
          </p>
        ) : null}

        {!documentsQuery.isLoading && !documentsQuery.isError && filtered.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 md:block">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-3 font-medium">Thumb</th>
                    <th className="px-3 py-3 font-medium">Document</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">Size</th>
                    <th className="hidden px-3 py-3 font-medium xl:table-cell">Added</th>
                    <th className="px-3 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filtered.map((doc) => (
                    <DocumentTableRow
                      key={doc.id}
                      doc={doc}
                      onPreview={() => setPreviewDoc(doc)}
                      onDownload={() => void handleDownload(doc.id, doc.originalName)}
                      onDelete={() => deleteMutation.mutate(doc.id)}
                      deletePending={deleteMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {filtered.map((doc) => (
                <DocumentMobileCard
                  key={doc.id}
                  doc={doc}
                  onPreview={() => setPreviewDoc(doc)}
                  onDownload={() => void handleDownload(doc.id, doc.originalName)}
                  onDelete={() => deleteMutation.mutate(doc.id)}
                  deletePending={deleteMutation.isPending}
                />
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
