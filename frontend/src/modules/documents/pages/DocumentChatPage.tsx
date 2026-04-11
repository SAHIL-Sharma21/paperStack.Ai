import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MessageSquarePlus, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
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

export function DocumentChatPage() {
  const queryClient = useQueryClient();
  const { documentId } = useParams<{ documentId: string }>();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [streamingText, setStreamingText] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipHydrateRef = useRef(false);
  const hydratedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const documentIdRef = useRef(documentId);
  documentIdRef.current = documentId;

  useEffect(() => {
    skipHydrateRef.current = false;
    hydratedRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages([]);
    setConversationId(undefined);
    setStreamingText('');
    setError(null);
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
    if (
      skipHydrateRef.current ||
      hydratedRef.current ||
      !documentId ||
      !conversationsQuery.data?.length
    ) {
      return;
    }
    hydratedRef.current = true;
    const latestId = conversationsQuery.data[0].id;
    const runForDocumentId = documentId;
    setConversationId(latestId);

    let cancelled = false;
    void chatApi.getConversation(documentId, latestId).then((c) => {
      if (cancelled) return;
      if (documentIdRef.current !== runForDocumentId) return;
      setMessages(c.messages);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId, conversationsQuery.data]);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    skipHydrateRef.current = true;
    hydratedRef.current = true;
    setMessages([]);
    setConversationId(undefined);
    setStreamingText('');
    setError(null);
    setBusy(false);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!documentId || !text || busy || doc?.status !== COMPLETED_STATUS) return;

    setInput('');
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setStreamingText('');
    setBusy(true);

    const ac = new AbortController();
    abortRef.current = ac;

    let assistantAcc = '';
    const sendForDocumentId = documentId;

    try {
      await streamDocumentChat(
        documentId,
        { message: text, conversationId },
        {
          signal: ac.signal,
          onPayload: (p) => {
            if (documentIdRef.current !== sendForDocumentId) return;
            if (typeof p.conversationId === 'string' && p.conversationId) {
              setConversationId(p.conversationId);
            }
            if (p.error) {
              setError(p.error);
            }
            if (typeof p.text === 'string' && p.text) {
              assistantAcc += p.text;
              setStreamingText(assistantAcc);
            }
            if (p.done) {
              if (assistantAcc.length > 0) {
                setMessages((m) => [...m, { role: 'assistant', content: assistantAcc }]);
              }
              setStreamingText('');
              assistantAcc = '';
              void queryClient.invalidateQueries({ queryKey: ['conversations', documentId] });
            }
          },
        },
      );
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed';
      setError(msg);
    } finally {
      setBusy(false);
      abortRef.current = null;
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Library
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={startNewConversation}
          disabled={busy}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Ask this document</h1>
        <p className="mt-1 truncate text-sm text-zinc-400" title={doc.originalName}>
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
          className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
        >
          {error}
        </div>
      ) : null}

      <div
        className="min-h-[280px] flex-1 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,.04)]"
        aria-live="polite"
      >
        {messages.length === 0 && !streamingText ? (
          <p className="text-center text-sm text-zinc-500">
            Ask a question about this document. Answers use your indexed content (RAG).
          </p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}-${m.content.slice(0, 12)}`}
            className={cn(
              'max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed',
              m.role === 'user'
                ? 'ml-auto bg-orange-500/20 text-orange-50 ring-1 ring-orange-500/25'
                : 'mr-auto bg-zinc-800/80 text-zinc-100 ring-1 ring-zinc-700/80',
            )}
          >
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {m.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {streamingText ? (
          <div className="mr-auto max-w-[95%] rounded-xl bg-zinc-800/80 px-3 py-2 text-sm leading-relaxed text-zinc-100 ring-1 ring-zinc-700/80">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Assistant
            </span>
            <p className="whitespace-pre-wrap">{streamingText}</p>
          </div>
        ) : null}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
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
            disabled={!canChat || busy}
            className="min-h-11 border-zinc-800 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <Button
          type="submit"
          disabled={!canChat || busy || !input.trim()}
          className="h-11 shrink-0 gap-2 sm:w-auto"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </form>
    </div>
  );
}
