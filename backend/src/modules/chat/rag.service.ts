/**
 * RAG Service - retrieve context, build prompt, stream LLM response
 * @author: Sahil Sharma
 */

import { Inject, Injectable } from '@nestjs/common';
import type { LlmChatPort } from '../llm/llm-chat.port';
import { LLM_CHAT_PORT } from '../llm/llm.tokens';
import type { LlmChatMessage } from '../llm/llm.types';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectordbService } from '../vectordb/vectordb.service';
import type { ChatMessage } from './schemas/conversation.schema';

const RAG_TOP_K = 8;

@Injectable()
export class RagService {
  constructor(
    @Inject(LLM_CHAT_PORT) private readonly llm: LlmChatPort,
    private embeddingsService: EmbeddingsService,
    private vectordbService: VectordbService,
  ) {}

  async *streamRagResponse(
    userId: string,
    documentId: string,
    query: string,
    history: ChatMessage[] = [],
  ): AsyncGenerator<string> {
    const queryEmbedding = await this.embeddingsService.embed(query);
    const results = await this.vectordbService.search(
      queryEmbedding,
      RAG_TOP_K,
      { userId, documentId },
    );

    const context = results
      .map((r) => {
        const raw = r.payload?.text;
        return typeof raw === 'string' ? raw : '';
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    const systemInstruction = this.buildSystemPrompt(context);

    const messages = this.buildLlmMessages(history, query, systemInstruction);

    for await (const chunk of this.llm.streamChat(messages, {
      maxOutputTokens: 2048,
    })) {
      yield chunk;
    }
  }

  //TODO: Add a prompt in the new files and import here.
  private buildSystemPrompt(context: string): string {
    return `You are a helpful assistant that answers questions based on the provided document context.

Use ONLY the following context from the user's document to answer. If the answer is not in the context, say so clearly.
Do not make up information. Quote or paraphrase from the context when relevant.

CONTEXT:
${context || '(No relevant context found. Ask the user to upload or process the document.)'}`;
  }

  private buildLlmMessages(
    history: ChatMessage[],
    currentMessage: string,
    systemInstruction: string,
  ): LlmChatMessage[] {
    return [
      { role: 'system', content: systemInstruction },
      ...history.map(
        (m): LlmChatMessage => ({
          role: m.role,
          content: m.content,
        }),
      ),
      { role: 'user', content: currentMessage },
    ];
  }
}
