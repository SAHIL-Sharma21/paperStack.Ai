import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { ApiError, documentsApi } from '../lib/api';
import { USAGE_QUERY_KEY, useUsageQuery } from '../lib/usage';
import { ACCEPT_ATTR } from './constant';
import { isAcceptedFile } from './helper';


type DocumentDropZoneProps = {
  onUploadSuccess?: () => void;
  className?: string;
};

export function DocumentDropZone({ onUploadSuccess, className }: DocumentDropZoneProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    function clearDrag() {
      setIsDragging(false);
    }
    document.addEventListener('dragend', clearDrag);
    return () => document.removeEventListener('dragend', clearDrag);
  }, []);

  const { data: usage } = useUsageQuery();
  const atDocumentLimit = usage != null && usage.documents.used >= usage.documents.limit;

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: () => {
      setUploadError(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      void queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY });
      onUploadSuccess?.();
    },
    onError: (error) => {
      setUploadError(
        error instanceof ApiError ? error.message : 'Upload failed. Try another file.',
      );
      void queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY });
    },
  });

  function handleFileChange(file: File | null) {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setUploadError('Please choose a PDF or Word file (.pdf, .doc, .docx).');
      return;
    }
    if (usage && file.size > usage.maxUploadMb * 1024 * 1024) {
      setUploadError(`This file is larger than ${usage.maxUploadMb} MB, the free plan limit.`);
      return;
    }
    setUploadError(null);
    uploadMutation.mutate(file);
  }

  function openFilePicker() {
    if (uploadMutation.isPending || atDocumentLimit) return;
    fileInputRef.current?.click();
  }

  return (
    <div className={cn('space-y-4', className)} id="upload">
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept={ACCEPT_ATTR}
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = e.relatedTarget as Node | null;
          if (next && e.currentTarget.contains(next)) return;
          setIsDragging(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (uploadMutation.isPending || atDocumentLimit) return;
          const file = e.dataTransfer.files?.[0] ?? null;
          handleFileChange(file);
        }}
        className={cn(
          'group relative flex min-h-[min(20rem,48vh)] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          'border-zinc-700/90 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/50',
          isDragging && 'border-orange-400 bg-orange-500/10 ring-2 ring-orange-400/30',
          uploadMutation.isPending && 'pointer-events-none cursor-wait opacity-70',
          atDocumentLimit && 'cursor-not-allowed opacity-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-500 transition-colors',
            'group-hover:text-orange-300/90',
            isDragging && 'bg-orange-500/20 text-orange-300',
          )}
        >
          <UploadCloud className="h-7 w-7" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="max-w-md space-y-2">
          <p className="text-lg font-medium text-zinc-100">Drag and drop your file here</p>
          <p className="text-sm text-zinc-500">
            PDF or Word (.pdf, .doc, .docx) — one file per upload
          </p>
          {usage ? (
            <p className="text-xs text-zinc-600">
              Free plan: up to {usage.maxUploadMb} MB and {usage.maxPdfPages} pages per file,{' '}
              {usage.documents.limit} documents in total
            </p>
          ) : null}
        </div>
        <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <span className="hidden text-sm text-zinc-600 sm:inline">or</span>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="w-full min-w-44 sm:w-auto"
            disabled={uploadMutation.isPending || atDocumentLimit}
            onClick={(e) => {
              e.stopPropagation();
              openFilePicker();
            }}
          >
            Browse files
          </Button>
        </div>
      </div>
      {uploadMutation.isPending ? (
        <p className="text-center text-sm text-zinc-400">Uploading document...</p>
      ) : null}
      {atDocumentLimit && usage ? (
        <p className="text-center text-sm text-amber-200">
          You&apos;ve used all {usage.documents.limit} documents on the free plan. Delete one from your
          library to upload another.
        </p>
      ) : null}
      {uploadError ? <p className="text-center text-sm text-rose-300">{uploadError}</p> : null}
    </div>
  );
}
