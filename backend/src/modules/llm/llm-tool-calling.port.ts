import type { LlmChatMessage, LlmFunctionToolDefinition } from './llm.types';

export interface LlmToolLoopResult {
  assistantText: string | null;
  messages: unknown[];
}

export interface LlmToolCallingPort {
  runToolLoop(
    initialMessages: unknown[],
    tools: readonly LlmFunctionToolDefinition[],
    executeTool: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<string>,
    options?: { model?: string; maxIterations?: number },
  ): Promise<LlmToolLoopResult>;
}

export function toAgentSeedMessages(
  messages: LlmChatMessage[],
): LlmChatMessage[] {
  return messages.map((m) => ({ ...m }));
}
