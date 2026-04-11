import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { LlmChatPort } from './llm-chat.port';
import type { LlmChatMessage, LlmStreamChatOptions } from './llm.types';

@Injectable()
export class GeminiChatLlmService implements LlmChatPort {
  private client: GoogleGenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  private getModel(): string {
    return this.config.get<string>('GEMINI_CHAT_MODEL', 'gemini-2.0-flash');
  }

  private splitForGemini(messages: LlmChatMessage[]): {
    systemInstruction: string;
    contents: Array<{
      role: 'user' | 'model';
      parts: { text: string }[];
    }>;
  } {
    const systemParts = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content);
    const systemInstruction = systemParts.join('\n\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m): { role: 'user' | 'model'; parts: { text: string }[] } => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    return { systemInstruction, contents };
  }

  async *streamChat(
    messages: LlmChatMessage[],
    options?: LlmStreamChatOptions,
  ): AsyncGenerator<string, void, unknown> {
    const { systemInstruction, contents } = this.splitForGemini(messages);
    const stream = await this.getClient().models.generateContentStream({
      model: this.getModel(),
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
      },
    });
    for await (const chunk of stream) {
      const text = (chunk as { text?: string }).text;
      if (text) yield text;
    }
  }
}
