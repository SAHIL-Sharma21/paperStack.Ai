/**
 * Embeddings Service - Gemini (API) or FastEmbed (local, no key)
 * Use EMBEDDING_PROVIDER=fastembed for free local embeddings.
 * @author: Sahil Sharma
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { FlagEmbedding, EmbeddingModel } from 'fastembed';
import {
  FASTEMBED_EMBEDDING_DIM,
  GEMINI_EMBEDDING_DIM,
  MAX_CHUNK_CHARS,
  type EmbeddingProvider,
} from './constant';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private provider: EmbeddingProvider;
  private geminiClient?: GoogleGenAI;
  private fastembed?: FlagEmbedding;

  constructor(private config: ConfigService) {
    const provider = this.config.get<string>('EMBEDDING_PROVIDER', 'fastembed');
    this.provider = provider === 'gemini' ? 'gemini' : 'fastembed';

    if (this.provider === 'gemini') {
      const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
      this.geminiClient = new GoogleGenAI({ apiKey });
    }
  }

  async onModuleInit() {
    if (this.provider === 'fastembed') {
      this.fastembed = await FlagEmbedding.init({
        model: EmbeddingModel.BGESmallENV15,
      });
      console.log('[EmbeddingsService] Using FastEmbed (local, no API key)');
    } else {
      console.log('[EmbeddingsService] Using Gemini API');
    }
  }

  getDimension(): number {
    return this.provider === 'gemini'
      ? GEMINI_EMBEDDING_DIM
      : FASTEMBED_EMBEDDING_DIM;
  }

  async embed(text: string): Promise<number[]> {
    if (this.provider === 'gemini') {
      return this.embedGemini(text);
    }
    return this.embedFastembed(text);
  }

  private async embedGemini(text: string): Promise<number[]> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized');
    const response = await this.geminiClient.models.embedContent({
      model: 'gemini-embedding-001',
      contents: [text],
    });
    const embedding = response.embeddings?.[0];
    if (!embedding?.values) throw new Error('No embedding from Gemini');
    return embedding.values;
  }

  private async embedFastembed(text: string): Promise<number[]> {
    if (!this.fastembed) throw new Error('FastEmbed not initialized');
    const gen = this.fastembed.passageEmbed([text], 1);
    const result = await gen.next();
    const vec = result.value?.[0];
    if (!vec) throw new Error('No embedding from FastEmbed');
    return Array.from(vec as number[] | Float32Array);
  }

  async chunkAndEmbed(
    text: string,
  ): Promise<Array<{ text: string; embedding: number[] }>> {
    const chunks = this.chunkText(text);
    const results: Array<{ text: string; embedding: number[] }> = [];

    if (this.provider === 'fastembed' && this.fastembed && chunks.length > 1) {
      const gen = this.fastembed.passageEmbed(chunks, 8);
      let idx = 0;
      for await (const batch of gen) {
        for (const vec of batch) {
          results.push({
            text: chunks[idx],
            embedding: Array.from(vec as number[] | Float32Array),
          });
          idx++;
        }
      }
    } else {
      for (const chunk of chunks) {
        const embedding = await this.embed(chunk);
        results.push({ text: chunk, embedding });
      }
    }
    return results;
  }

  private chunkText(text: string): string[] {
    if (!text?.trim()) return [];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + MAX_CHUNK_CHARS, text.length);
      if (end <= start) {
        end = start + 1;
      }
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) end = lastSpace;
      }
      if (end <= start) end = start + 1;

      const piece = text.slice(start, end).trim();
      if (piece) chunks.push(piece);
      start = end;
    }
    return chunks;
  }
}
