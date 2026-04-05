import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { documentsApi } from '../lib/api';

const ACCEPT_ATTR =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function isAcceptedFile(file: File): boolean {
  if (file.type && ACCEPTED_MIME.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx');
}

type DocumentDropZoneProps = {
  onUploadSuccess?: () => void;
  /** Extra class on the outer dashed region */
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

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: () => {
      setUploadError(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      onUploadSuccess?.();
    },
    onError: () => {
      setUploadError('Upload failed. Try another file.');
    },
  });

  function handleFileChange(file: File | null) {
    if (!file) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!isAcceptedFile(file)) {
      setUploadError('Please choose a PDF or Word file (.pdf, .doc, .docx).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploadError(null);
    uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function openFilePicker() {
    if (uploadMutation.isPending) return;
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
          if (uploadMutation.isPending) return;
          const file = e.dataTransfer.files?.[0] ?? null;
          handleFileChange(file);
        }}
        className={cn(
          'group relative flex min-h-[min(20rem,48vh)] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          'border-zinc-700/90 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/50',
          isDragging && 'border-orange-400 bg-orange-500/10 ring-2 ring-orange-400/30',
          uploadMutation.isPending && 'pointer-events-none cursor-wait opacity-70',
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
        </div>
        <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <span className="hidden text-sm text-zinc-600 sm:inline">or</span>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="w-full min-w-44 sm:w-auto"
            disabled={uploadMutation.isPending}
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
      {uploadError ? <p className="text-center text-sm text-rose-300">{uploadError}</p> : null}
    </div>
  );
}
