import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LlmChatPort } from './llm-chat.port';
import type { LlmChatMessage, LlmStreamChatOptions } from './llm.types';
import { GroqApiClient } from './groq-api.client';

@Injectable()
export class GroqChatLlmService implements LlmChatPort {
  private client: GroqApiClient | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): GroqApiClient {
    if (!this.client) {
      const apiKey = this.config.getOrThrow<string>('GROQ_API_KEY');
      this.client = new GroqApiClient(apiKey);
    }
    return this.client;
  }

  private getModel(): string {
    return this.config.get<string>('GROQ_CHAT_MODEL', 'openai/gpt-oss-20b');
  }

  async *streamChat(
    messages: LlmChatMessage[],
    options?: LlmStreamChatOptions,
  ): AsyncGenerator<string, void, unknown> {
    const openAiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const max_tokens = options?.maxOutputTokens ?? 2048;
    yield* this.getClient().chatCompletionsStream({
      model: this.getModel(),
      messages: openAiMessages,
      stream: true,
      max_tokens,
    });
  }
}
