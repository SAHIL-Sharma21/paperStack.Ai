/**
 * RAG Service - retrieve context, build prompt, stream LLM response
 * @author: Sahil Sharma
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectordbService } from '../vectordb/vectordb.service';
import type { ChatMessage } from './schemas/conversation.schema';

const RAG_TOP_K = 8;

@Injectable()
export class RagService {
  private geminiClient: GoogleGenAI;

  constructor(
    private config: ConfigService,
    private embeddingsService: EmbeddingsService,
    private vectordbService: VectordbService,
  ) {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    this.geminiClient = new GoogleGenAI({ apiKey });
  }

  private getModel(): string {
    return this.config.get<string>(
      'GEMINI_CHAT_MODEL',
      'gemini-2.0-flash',
    );
  }

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
      .map((r) => String(r.payload?.text ?? ''))
      .filter(Boolean)
      .join('\n\n---\n\n');

    const systemInstruction = this.buildSystemPrompt(context);

    const contents = this.buildContents(history, query);

    const stream = await this.geminiClient.models.generateContentStream({
      model: this.getModel(),
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 2048,
      },
    });

    for await (const chunk of stream) {
      const text = (chunk as { text?: string }).text;
      if (text) yield text;
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

  private buildContents(
    history: ChatMessage[],
    currentMessage: string,
  ): string | Array<{ role: string; parts: { text: string }[] }> {
    if (history.length === 0) {
      return currentMessage;
    }

    const messages = [
      ...history.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model' as const,
        parts: [{ text: m.content }],
      })),
      { role: 'user' as const, parts: [{ text: currentMessage }] },
    ];
    return messages;
  }
}
