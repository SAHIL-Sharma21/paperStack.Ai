/**
 * Provider-agnostic chat types for document RAG and future agents.
 */

export type LlmMessageRole = 'system' | 'user' | 'assistant';

export interface LlmChatMessage {
  role: LlmMessageRole;
  content: string;
}

export interface LlmStreamChatOptions {
  maxOutputTokens?: number;
}

/** JSON Schema object for function parameters (OpenAI tools format). */
export type LlmToolParametersSchema = Record<string, unknown>;

export interface LlmFunctionToolDefinition {
  name: string;
  description?: string;
  parameters: LlmToolParametersSchema;
}
