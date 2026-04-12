import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DocumentConversationSidebar } from '../../../components/chat/DocumentConversationSidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  ApiError,
  chatApi,
  documentsApi,
  streamDocumentChat,
} from '../../../lib/api';
import type { ChatTurn } from '../../../lib/types';
import { cn } from '../../../lib/utils';
import { COMPLETED_STATUS } from './constants';

const ChatMarkdown = lazy(() =>
  import('../../../components/chat/ChatMarkdown').then((m) => ({ default: m.ChatMarkdown })),
);

export function DocumentChatPage() {
  const queryClient = useQueryClient();
  const { documentId } = useParams<{ documentId: string }>();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [streamingText, setStreamingText] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftNewThread, setDraftNewThread] = useState(false);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const loadingConversationIdRef = useRef<string | null>(null);
  loadingConversationIdRef.current = loadingConversationId;
  /** Bumped when starting send or switching threads so stale `getConversation` results cannot overwrite the UI. */
  const conversationSwitchGenerationRef = useRef(0);
  const hydratedRef = useRef(false);
  const skipHydrateRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const documentIdRef = useRef(documentId);
  documentIdRef.current = documentId;
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  const hydrateRequestIdRef = useRef(0);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  /** Mirrors streamed assistant text so `done` always matches what we showed (avoids stale `let` vs batched state). */
  const streamAccRef = useRef('');

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, []);

  useLayoutEffect(() => {
    scrollMessagesToBottom();
  }, [messages, streamingText, busy, scrollMessagesToBottom]);

  useEffect(() => {
    hydratedRef.current = false;
    skipHydrateRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages([]);
    setInput('');
    setConversationId(undefined);
    setStreamingText('');
    setError(null);
    setDraftNewThread(false);
    setLoadingConversationId(null);
    streamAccRef.current = '';
    conversationSwitchGenerationRef.current = 0;
  }, [documentId]);

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
  });

  const doc = documentsQuery.data?.find((d) => d.id === documentId);

  const conversationsQuery = useQuery({
    queryKey: ['conversations', documentId],
    queryFn: () => chatApi.listConversations(documentId!),
    enabled: Boolean(documentId),
  });

  useEffect(() => {
    if (skipHydrateRef.current || hydratedRef.current || !documentId) {
      return;
    }
    if (conversationsQuery.isError) {
      return;
    }
    const rows = conversationsQuery.data;
    if (rows == null) {
      return;
    }
    if (rows.length === 0) {
      hydratedRef.current = true;
      return;
    }
    const latestId = rows[0].id;
    const runForDocumentId = documentId;
    const runForConversationId = latestId;
    const requestId = ++hydrateRequestIdRef.current;

    const ac = new AbortController();
    void chatApi
      .getConversation(documentId, latestId, { signal: ac.signal })
      .then((c) => {
        if (ac.signal.aborted) return;
        if (documentIdRef.current !== runForDocumentId) return;
        if (hydrateRequestIdRef.current !== requestId) return;
        if (skipHydrateRef.current) {
          return;
        }
        // Avoid replacing in-flight chat UI with a stale GET while POST /chat is streaming.
        if (abortRef.current !== null) {
          return;
        }
        if (c.id !== runForConversationId) return;
        setConversationId(c.id);
        setMessages(c.messages);
        hydratedRef.current = true;
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        if (documentIdRef.current !== runForDocumentId) return;
        if (hydrateRequestIdRef.current !== requestId) return;
        const aborted =
          (e instanceof Error && e.name === 'AbortError') ||
          (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError');
        if (aborted) return;
        hydratedRef.current = false;
        setConversationId(undefined);
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to load conversation';
        setError(msg);
      });

    return () => {
      ac.abort();
    };
  }, [documentId, conversationsQuery.data, conversationsQuery.isError]);

  const conversationRows = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  );

  const startNewConversation = useCallback(() => {
    conversationSwitchGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    skipHydrateRef.current = true;
    hydratedRef.current = true;
    setDraftNewThread(true);
    setMessages([]);
    setConversationId(undefined);
    setStreamingText('');
    streamAccRef.current = '';
    setError(null);
    setBusy(false);
    setLoadingConversationId(null);
  }, []);

  const deleteConversationMutation = useMutation({
    mutationFn: (convId: string) => chatApi.deleteConversation(documentId!, convId),
    onSuccess: (_data, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', documentId] });
      if (deletedId === conversationIdRef.current) {
        startNewConversation();
      }
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to delete chat';
      setError(msg);
    },
  });

  const selectConversation = useCallback(
    async (id: string) => {
      if (!documentId || busy) return;
      if (id === conversationIdRef.current) return;
      const loadGeneration = ++conversationSwitchGenerationRef.current;
      const runForDocumentId = documentId;
      abortRef.current?.abort();
      abortRef.current = null;
      setBusy(false);
      setStreamingText('');
      streamAccRef.current = '';
      setError(null);
      skipHydrateRef.current = false;
      hydratedRef.current = true;
      setDraftNewThread(false);
      setLoadingConversationId(id);
      try {
        const c = await chatApi.getConversation(documentId, id);
        if (documentIdRef.current !== runForDocumentId) return;
        if (conversationSwitchGenerationRef.current !== loadGeneration) {
          return;
        }
        setConversationId(c.id);
        setMessages(c.messages);
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to open chat';
        setError(msg);
      } finally {
        setLoadingConversationId(null);
      }
    },
    [documentId, busy],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!documentId || !text || busy || doc?.status !== COMPLETED_STATUS) return;
    if (loadingConversationIdRef.current) {
      return;
    }

    conversationSwitchGenerationRef.current += 1;

    setInput('');
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setStreamingText('');
    streamAccRef.current = '';
    setBusy(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const sendForDocumentId = documentId;

    try {
      await streamDocumentChat(
        documentId,
        { message: text, conversationId },
        {
          signal: ac.signal,
          onPayload: (p) => {
            if (abortRef.current !== ac) return;
            if (documentIdRef.current !== sendForDocumentId) return;
            if (typeof p.conversationId === 'string' && p.conversationId) {
              setConversationId(p.conversationId);
              setDraftNewThread(false);
            }
            if (p.error) {
              setError(p.error);
            }
            if (typeof p.text === 'string') {
              streamAccRef.current += p.text;
              setStreamingText(streamAccRef.current);
            }
            if (p.done) {
              const full = streamAccRef.current;
              if (full.length > 0) {
                setMessages((m) => [...m, { role: 'assistant', content: full }]);
              }
              streamAccRef.current = '';
              setStreamingText('');
              setBusy(false);
              void queryClient.invalidateQueries({ queryKey: ['conversations', documentId] });
            }
          },
        },
      );
    } catch (e) {
      if (abortRef.current !== ac) return;
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed';
      setError(msg);
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }, [documentId, input, busy, doc?.status, conversationId, queryClient]);

  if (!documentId) {
    return (
      <p className="text-sm text-zinc-400">
        Missing document id.{' '}
        <Link to="/documents" className="text-orange-300 underline">
          Back to library
        </Link>
      </p>
    );
  }

  if (documentsQuery.isLoading) {
    return <p className="text-sm text-zinc-400">Loading…</p>;
  }

  if (documentsQuery.isError || !doc) {
    return (
      <p className="text-sm text-rose-300">
        Document not found or you don&apos;t have access.{' '}
        <Link to="/documents" className="text-orange-300 underline">
          Library
        </Link>
      </p>
    );
  }

  const canChat = doc.status === COMPLETED_STATUS;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 md:gap-4">
      <div className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">Ask this document</h1>
        <p className="mt-0.5 truncate text-sm text-zinc-400" title={doc.originalName}>
          {doc.originalName}
        </p>
        {!canChat ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            This file is still <strong>{doc.status}</strong>. Chat is available when status is{' '}
            <strong>completed</strong>.
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="shrink-0 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
        >
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-0">
        <DocumentConversationSidebar
          conversations={conversationRows}
          activeConversationId={conversationId}
          draftNewThread={draftNewThread}
          listLoading={conversationsQuery.isLoading}
          allowInteraction={canChat}
          busy={busy}
          loadingConversationId={loadingConversationId}
          deletingConversationId={
            deleteConversationMutation.isPending && deleteConversationMutation.variables != null
              ? deleteConversationMutation.variables
              : null
          }
          onNewChat={startNewConversation}
          onSelectConversation={selectConversation}
          onRequestDeleteConversation={(id) => {
            const row = conversationRows.find((r) => r.id === id);
            const label =
              typeof row?.title === 'string' && row.title.trim().length > 0
                ? row.title.trim()
                : 'Conversation';
            setDeleteTarget({ id, title: label });
          }}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div
            ref={messagesScrollRef}
            className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto overscroll-y-contain rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 pb-10 pt-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,.04)] [scrollbar-gutter:stable]"
            aria-live="polite"
          >
            {messages.length === 0 && !streamingText && !busy ? (
              <div className="flex min-h-[min(280px,45dvh)] flex-1 flex-col items-center justify-center px-4 py-10 text-center">
                <p className="max-w-md text-lg font-bold leading-tight text-zinc-50 sm:text-xl">
                  Ask anything about this document.
                </p>
                <p className="mt-3 max-w-md text-sm font-normal leading-relaxed text-zinc-400">
                  Summaries, details, or quick clarifications—your answers come straight from this file.
                </p>
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={`${conversationId ?? 'new'}-${i}-${m.role}-${m.content.length}`}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto max-w-[min(100%,26rem)] bg-orange-500/20 text-orange-50 ring-1 ring-orange-500/25'
                    : 'w-full max-w-full bg-zinc-800/80 text-zinc-100 ring-1 ring-zinc-700/80',
                )}
              >
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </span>
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-orange-50/95">{m.content}</p>
                ) : (
                  <Suspense
                    fallback={
                      <div
                        className="h-14 w-full max-w-md animate-pulse rounded-lg bg-zinc-800/60"
                        aria-hidden
                      />
                    }
                  >
                    <ChatMarkdown content={m.content} />
                  </Suspense>
                )}
              </div>
            ))}
            {busy || streamingText !== '' ? (
              <div className="w-full max-w-full rounded-xl bg-zinc-800/80 px-3 py-2 text-sm leading-relaxed text-zinc-100 ring-1 ring-zinc-700/80">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Assistant
                </span>
                {busy && streamingText === '' ? (
                  <div className="flex items-center gap-2 py-1 text-zinc-400">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    <span className="text-sm">Working…</span>
                  </div>
                ) : null}
                {streamingText !== '' ? (
                  <pre className="max-w-full whitespace-pre-wrap wrap-break-word font-sans text-sm leading-relaxed text-zinc-100">
                    {streamingText}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>

          <form
            className="flex shrink-0 flex-col gap-2 border-t border-zinc-800/80 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="chat-input" className="sr-only">
                Message
              </label>
              <Input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={canChat ? 'e.g. Summarize the main sections…' : 'Wait until processing completes…'}
                disabled={!canChat || busy || loadingConversationId !== null}
                className="min-h-11 border-zinc-800 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-inset"
              />
            </div>
            <Button
              type="submit"
              disabled={!canChat || busy || loadingConversationId !== null || !input.trim()}
              className="h-11 shrink-0 gap-2 focus-visible:ring-inset sm:w-auto"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </form>
        </div>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span className="text-zinc-500">This removes </span>
                <span className="font-medium text-zinc-300">
                  &ldquo;
                  {deleteTarget && deleteTarget.title.length > 140
                    ? `${deleteTarget.title.slice(0, 137)}…`
                    : (deleteTarget?.title ?? '')}
                  &rdquo;
                </span>
                <span className="text-zinc-500">{" and all messages in it. You can't undo this."}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConversationMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConversationMutation.isPending}
              className={cn(buttonVariants({ variant: 'danger' }), 'focus-visible:ring-inset')}
              onClick={() => {
                if (!deleteTarget) return;
                void deleteConversationMutation.mutateAsync(deleteTarget.id).finally(() => {
                  setDeleteTarget(null);
                });
              }}
            >
              {deleteConversationMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Deleting…
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
