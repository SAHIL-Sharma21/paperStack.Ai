import type { LlmChatMessage, LlmStreamChatOptions } from './llm.types';

export interface LlmChatPort {
  streamChat(
    messages: LlmChatMessage[],
    options?: LlmStreamChatOptions,
  ): AsyncGenerator<string, void, unknown>;
}
