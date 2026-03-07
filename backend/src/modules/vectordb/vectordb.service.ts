/**
 * Vector DB Service - Qdrant operations
 * Creates collection programmatically if missing; upserts vectors
 * @author: Sahil Sharma
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbeddingProvider, FASTEMBED_EMBEDDING_DIM, GEMINI_EMBEDDING_DIM } from '../embeddings/constant';
import { COLLECTION_NAME } from './constant';


@Injectable()
export class VectordbService implements OnModuleInit {
  private client: QdrantClient;
  private embeddingDimension: number;

  constructor(private config: ConfigService) {
    const url = this.config.getOrThrow<string>('QDRANT_URL');
    const apiKey = this.config.get<string>('QDRANT_API_KEY');
    this.client = new QdrantClient({
      url,
      apiKey: apiKey || undefined,
    });
    const provider = this.config.get<string>('EMBEDDING_PROVIDER', 'fastembed');
    this.embeddingDimension = this.getEmbeddingDimension(provider as EmbeddingProvider);
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  /** Create collection if it doesn't exist; optionally recreate to fix schema mismatch */
  private async ensureCollection() {
    const recreate = this.config.get<string>('QDRANT_RECREATE_COLLECTION') === 'true';
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (recreate && exists) {
      await this.client.deleteCollection(COLLECTION_NAME);
      console.log('[VectordbService] Deleted collection (recreate requested):', COLLECTION_NAME);
    }

    if (!exists || recreate) {
      await this.client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: this.embeddingDimension,
          distance: 'Cosine',
        },
      });
      console.log('[VectordbService] Created collection:', COLLECTION_NAME);
    }
  }

  private readonly BATCH_SIZE = 50;

  /** Upsert/insert document chunks with metadata */
  async upsert(
    documentId: string,
    userId: string,
    chunks: Array<{ text: string; embedding: number[] }>,
    metadata?: { originalName?: string },
  ) {
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const points = batch.map((chunk, idx) => ({
        id: randomUUID(),
        vector: Array.from(chunk.embedding) as number[],
        payload: {
          documentId,
          userId,
          chunkIndex: i + idx,
          text: chunk.text,
          ...metadata,
        },
      }));

      await this.client.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });
    }
  }

  /** Search similar chunks (for RAG later) */
  async search(
    embedding: number[],
    topK = 5,
    filter?: { userId?: string; documentId?: string },
  ) {
    const result = await this.client.search(COLLECTION_NAME, {
      vector: embedding,
      limit: topK,
      filter: filter
        ? {
            must: [
              ...(filter.userId
                ? [{ key: 'userId', match: { value: filter.userId } }]
                : []),
              ...(filter.documentId
                ? [{ key: 'documentId', match: { value: filter.documentId } }]
                : []),
            ].filter(Boolean),
          }
        : undefined,
    });
    return result;
  }

  private getEmbeddingDimension(provider: string): number{
    return provider === 'gemini' ? GEMINI_EMBEDDING_DIM : FASTEMBED_EMBEDDING_DIM;
  }

}
