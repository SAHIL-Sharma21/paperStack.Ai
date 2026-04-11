const GROQ_BASE = 'https://api.groq.com/openai/v1';

const DEFAULT_GROQ_REQUEST_TIMEOUT_MS = 300_000;

function getGroqRequestTimeoutMs(): number {
  const raw = process.env.GROQ_REQUEST_TIMEOUT_MS;
  if (raw == null || raw === '') return DEFAULT_GROQ_REQUEST_TIMEOUT_MS;
  const n = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_GROQ_REQUEST_TIMEOUT_MS;
}

function beginGroqRequestTimeout(ms: number): {
  signal: AbortSignal;
  finish: () => void;
} {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    finish: () => clearTimeout(t),
  };
}

export interface GroqChatCompletionNonStreamBody {
  model: string;
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
  max_tokens?: number;
}

function* sseLinesToContentDeltas(
  lines: string[],
): Generator<string, boolean, unknown> {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') return true;
    try {
      const json = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.delta?.content;
      if (content) yield content;
    } catch {
      /* ignore malformed chunk */
    }
  }
  return false;
}

async function* parseSseTextDeltas(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string, void, unknown> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode(undefined, { stream: false });
        const ended = yield* sseLinesToContentDeltas(buffer.split('\n'));
        if (ended) return;
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      const ended = yield* sseLinesToContentDeltas(parts);
      if (ended) return;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore cancel errors */
    }
    try {
      reader.releaseLock();
    } catch {
      /* ignore if lock already released */
    }
  }
}

export class GroqApiClient {
  constructor(private readonly apiKey: string) {}

  async *chatCompletionsStream(
    body: Omit<GroqChatCompletionNonStreamBody, 'tools' | 'tool_choice'> & {
      stream: true;
    },
  ): AsyncGenerator<string, void, unknown> {
    const ms = getGroqRequestTimeoutMs();
    const { signal, finish } = beginGroqRequestTimeout(ms);
    try {
      const res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, stream: true }),
        signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(
          `Groq chat stream failed: ${res.status} ${res.statusText} ${errText}`,
        );
      }
      yield* parseSseTextDeltas(res.body);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(`Groq request timed out after ${ms}ms`, { cause: e });
      }
      throw e;
    } finally {
      finish();
    }
  }

  async chatCompletionsCreate(
    body: GroqChatCompletionNonStreamBody,
  ): Promise<unknown> {
    const ms = getGroqRequestTimeoutMs();
    const { signal, finish } = beginGroqRequestTimeout(ms);
    try {
      const res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, stream: false }),
        signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(
          `Groq chat completion failed: ${res.status} ${res.statusText} ${errText}`,
        );
      }
      return (await res.json()) as unknown;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(`Groq request timed out after ${ms}ms`, { cause: e });
      }
      throw e;
    } finally {
      finish();
    }
  }
}
