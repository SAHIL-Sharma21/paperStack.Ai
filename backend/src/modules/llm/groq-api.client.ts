const GROQ_BASE = 'https://api.groq.com/openai/v1';

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
}

export class GroqApiClient {
  constructor(private readonly apiKey: string) {}

  async *chatCompletionsStream(
    body: Omit<GroqChatCompletionNonStreamBody, 'tools' | 'tool_choice'> & {
      stream: true;
    },
  ): AsyncGenerator<string, void, unknown> {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, stream: true }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `Groq chat stream failed: ${res.status} ${res.statusText} ${errText}`,
      );
    }
    yield* parseSseTextDeltas(res.body);
  }

  async chatCompletionsCreate(
    body: GroqChatCompletionNonStreamBody,
  ): Promise<unknown> {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, stream: false }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `Groq chat completion failed: ${res.status} ${res.statusText} ${errText}`,
      );
    }
    return res.json() as Promise<unknown>;
  }
}
