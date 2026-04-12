import { Loader2, MessageSquarePlus, Trash2 } from 'lucide-react';
import type { ConversationListItem } from '../../lib/types';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

type DocumentConversationSidebarProps = {
  conversations: ConversationListItem[];
  activeConversationId?: string;
  draftNewThread: boolean;
  listLoading: boolean;
  allowInteraction: boolean;
  busy: boolean;
  loadingConversationId: string | null;
  deletingConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRequestDeleteConversation: (id: string) => void;
};

function formatConversationSubtitle(c: ConversationListItem): string {
  const raw = c.lastMessageAt ?? c.createdAt;
  if (raw) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(raw));
    } catch {
      /* fall through */
    }
  }
  const n = c.messageCount;
  return `${n} message${n === 1 ? '' : 's'}`;
}

export function DocumentConversationSidebar({
  conversations,
  activeConversationId,
  draftNewThread,
  listLoading,
  allowInteraction,
  busy,
  loadingConversationId,
  deletingConversationId,
  onNewChat,
  onSelectConversation,
  onRequestDeleteConversation,
}: DocumentConversationSidebarProps) {
  return (
    <aside
      className={cn(
        'flex max-h-52 min-h-0 w-full shrink-0 touch-manipulation flex-col rounded-xl border-b border-zinc-800 bg-zinc-950/50 p-2 md:border-b-0 md:border-r',
        'md:max-h-none md:h-full md:w-60 md:rounded-none md:bg-transparent md:p-0 md:pr-3',
      )}
    >
      <div className="shrink-0 space-y-2 pb-2 md:pb-3">
        <p className="hidden px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 md:block">
          Chats
        </p>
        <Button
          type="button"
          variant={draftNewThread ? 'default' : 'secondary'}
          size="sm"
          className="h-9 w-full justify-start gap-2 px-2"
          onClick={onNewChat}
          disabled={busy || !allowInteraction}
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          New chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain md:min-h-[120px]">
        {listLoading ? (
          <p className="px-2 py-2 text-xs text-zinc-500">Loading chats…</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-2 text-xs leading-relaxed text-zinc-500">
            No saved chats yet. Send a message to start your first thread.
          </p>
        ) : (
          <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-x-visible md:pb-0">
            {conversations.map((c) => {
              const active = c.id === activeConversationId && !draftNewThread;
              const loading = loadingConversationId === c.id;
              const deleting = deletingConversationId === c.id;
              const title =
                typeof c.title === 'string' && c.title.trim().length > 0
                  ? c.title.trim()
                  : 'Conversation';
              return (
                <li key={c.id} className="shrink-0 md:w-full">
                  <div
                    className={cn(
                      'flex max-w-[200px] items-stretch gap-0.5 rounded-lg md:max-w-none',
                      active ? 'bg-orange-500/15 ring-1 ring-orange-500/35' : 'hover:bg-zinc-800/60',
                    )}
                  >
                    <button
                      type="button"
                      disabled={busy || loading || deleting || !allowInteraction}
                      onClick={() => onSelectConversation(c.id)}
                      className={cn(
                        'flex min-w-0 flex-1 flex-col gap-0.5 rounded-md px-2 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50',
                        active ? 'text-orange-50' : 'text-zinc-400',
                        (busy || loading || deleting) && !active && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <span className="flex items-start gap-1.5">
                        {loading ? (
                          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                        ) : null}
                        <span className="line-clamp-2 font-semibold leading-snug text-zinc-100">{title}</span>
                      </span>
                      <span className="truncate pl-0.5 text-[11px] text-zinc-500">
                        {formatConversationSubtitle(c)}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Delete chat"
                      disabled={busy || loading || deleting || !allowInteraction}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDeleteConversation(c.id);
                      }}
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-md px-1.5 text-zinc-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50',
                        deleting && 'pointer-events-none opacity-50',
                      )}
                      aria-label={`Delete chat: ${title}`}
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
