import { useUsageQuery } from '../lib/usage';

export function UsageBadge() {
  const { data: usage } = useUsageQuery();
  if (!usage) return null;

  const { documents, chatMessagesToday } = usage;

  return (
    <span
      className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-1.5 text-xs text-zinc-400 sm:inline-flex"
      title={`Free plan: up to ${documents.limit} documents and ${chatMessagesToday.limit} chat messages per day`}
    >
      <span className="font-medium text-orange-300">Free plan</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        {documents.used}/{documents.limit} docs
      </span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        {chatMessagesToday.used}/{chatMessagesToday.limit} messages today
      </span>
    </span>
  );
}
