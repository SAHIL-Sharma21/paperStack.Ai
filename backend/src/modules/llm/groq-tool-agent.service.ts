import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LlmToolCallingPort,
  LlmToolLoopResult,
} from './llm-tool-calling.port';
import type { LlmFunctionToolDefinition } from './llm.types';
import { GroqApiClient } from './groq-api.client';

type ToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type AssistantMessage = {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseCompletionMessage(data: unknown): AssistantMessage {
  if (!isRecord(data)) {
    throw new Error('Invalid Groq completion response');
  }
  const choicesUnknown: unknown = data['choices'];
  if (!Array.isArray(choicesUnknown) || choicesUnknown.length === 0) {
    throw new Error('Groq completion: empty choices');
  }
  const firstChoice: unknown = choicesUnknown[0];
  if (!isRecord(firstChoice)) {
    throw new Error('Groq completion: invalid choice');
  }
  const message = firstChoice['message'];
  if (!isRecord(message)) throw new Error('Groq completion: missing message');
  const role = message['role'];
  if (role !== 'assistant') {
    throw new Error(
      `Groq completion: expected assistant message, got ${String(role)}`,
    );
  }
  const content =
    typeof message['content'] === 'string' || message['content'] === null
      ? message['content']
      : null;
  const rawCalls = message['tool_calls'];
  const tool_calls: ToolCall[] = [];
  if (Array.isArray(rawCalls)) {
    for (const c of rawCalls) {
      if (!isRecord(c)) continue;
      const id = typeof c['id'] === 'string' ? c['id'] : '';
      const type = c['type'] === 'function' ? 'function' : null;
      const fn = c['function'];
      if (!type || !isRecord(fn)) continue;
      const name = typeof fn['name'] === 'string' ? fn['name'] : '';
      const args = typeof fn['arguments'] === 'string' ? fn['arguments'] : '{}';
      if (id && name)
        tool_calls.push({
          id,
          type: 'function',
          function: { name, arguments: args },
        });
    }
  }
  return {
    role: 'assistant',
    content,
    tool_calls: tool_calls.length ? tool_calls : undefined,
  };
}

@Injectable()
export class GroqToolAgentService implements LlmToolCallingPort {
  private client: GroqApiClient | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): GroqApiClient {
    if (!this.client) {
      const apiKey = this.config.getOrThrow<string>('GROQ_API_KEY');
      this.client = new GroqApiClient(apiKey);
    }
    return this.client;
  }

  private defaultModel(): string {
    return this.config.get<string>('GROQ_CHAT_MODEL', 'openai/gpt-oss-20b');
  }

  private toOpenAiTools(
    tools: readonly LlmFunctionToolDefinition[],
  ): unknown[] {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  async runToolLoop(
    initialMessages: unknown[],
    tools: readonly LlmFunctionToolDefinition[],
    executeTool: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<string>,
    options?: { model?: string; maxIterations?: number },
  ): Promise<LlmToolLoopResult> {
    const messages = initialMessages;
    const model = options?.model ?? this.defaultModel();
    const maxIterations = options?.maxIterations ?? 16;
    const openAiTools = this.toOpenAiTools(tools);

    for (let i = 0; i < maxIterations; i++) {
      const raw = await this.getClient().chatCompletionsCreate({
        model,
        messages,
        tools: openAiTools,
      });
      const assistant = parseCompletionMessage(raw);
      messages.push(assistant);

      const calls = assistant.tool_calls;
      if (!calls?.length) {
        return { assistantText: assistant.content, messages };
      }

      for (const tool of calls) {
        const functionName = tool.function.name;
        let functionArgs: Record<string, unknown> = {};
        try {
          functionArgs = JSON.parse(tool.function.arguments) as Record<
            string,
            unknown
          >;
        } catch {
          functionArgs = {};
        }
        const result = await executeTool(functionName, functionArgs);
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tool.id,
        });
      }
    }

    throw new Error(`Groq tool loop exceeded maxIterations (${maxIterations})`);
  }
}
