import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { documentsApi } from '../../../lib/api';

function statusVariant(status: string): 'processing' | 'completed' | 'failed' | 'default' {
  const normalized = status.toLowerCase();
  if (normalized === 'processing') return 'processing';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'failed') return 'failed';
  return 'default';
}

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
  });

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: () => {
      setUploadError(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => {
      setUploadError('Upload failed. Try another file.');
      console.error('[DocumentsPage] upload error:', err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  function handleFileChange(file: File | null) {
    if (!file) return;
    uploadMutation.mutate(file);
  }

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-orange-300" />
            Documents
          </CardTitle>
          <CardDescription>
            Upload PDF/Word files, wait for processing, then run semantic search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:bg-orange-400"
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {uploadMutation.isPending ? (
            <p className="text-sm text-zinc-400">Uploading document...</p>
          ) : null}
          {uploadError ? <p className="text-sm text-rose-300">{uploadError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your files</CardTitle>
          <CardDescription>Delete documents when you no longer need them.</CardDescription>
        </CardHeader>
        <CardContent>
          {documentsQuery.isLoading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
          {documentsQuery.isError ? (
            <p className="text-sm text-rose-300">Failed to load documents.</p>
          ) : null}

          <ul className="space-y-3">
            {documentsQuery.data?.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-zinc-100">
                    <FileText className="h-4 w-4 text-zinc-400" />
                    <span className="font-medium">{doc.originalName}</span>
                  </p>
                  <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => deleteMutation.mutate(doc.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
