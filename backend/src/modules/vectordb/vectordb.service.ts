/**
 * Vector DB Service - Qdrant operations
 * Creates collection programmatically if missing; upserts vectors
 * @author: Sahil Sharma
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  EmbeddingProvider,
  FASTEMBED_EMBEDDING_DIM,
  GEMINI_EMBEDDING_DIM,
} from '../embeddings/constant';
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
    this.embeddingDimension = this.getEmbeddingDimension(
      provider as EmbeddingProvider,
    );
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  /** Create collection if it doesn't exist; validate vector size when reusing */
  private async ensureCollection() {
    const recreate =
      this.config.get<string>('QDRANT_RECREATE_COLLECTION') === 'true';
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME,
    );

    if (exists && !recreate) {
      const info = await this.client.getCollection(COLLECTION_NAME);
      const existingSize = this.getVectorSizeFromConfig(
        info.config?.params?.vectors,
      );
      if (existingSize != null && existingSize !== this.embeddingDimension) {
        console.warn(
          `[VectordbService] Collection ${COLLECTION_NAME} has vector size ${existingSize}, expected ${this.embeddingDimension}. Recreating.`,
        );
        await this.client.deleteCollection(COLLECTION_NAME);
        await this.createCollection();
        await this.ensurePayloadIndexes();
        return;
      }
    }

    if (recreate && exists) {
      await this.client.deleteCollection(COLLECTION_NAME);
      console.log(
        '[VectordbService] Deleted collection (recreate requested):',
        COLLECTION_NAME,
      );
    }

    if (!exists || recreate) {
      await this.createCollection();
    }

    await this.ensurePayloadIndexes();
  }

  private async createCollection() {
    await this.client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: this.embeddingDimension,
        distance: 'Cosine',
      },
    });
    console.log('[VectordbService] Created collection:', COLLECTION_NAME);
  }

  /** Create payload indexes for filterable fields (userId, documentId) in parallel */
  private async ensurePayloadIndexes(): Promise<void> {
    await Promise.all([
      this.createPayloadIndexIfMissing('userId'),
      this.createPayloadIndexIfMissing('documentId'),
    ]);
  }

  private async createPayloadIndexIfMissing(fieldName: string): Promise<void> {
    try {
      await this.client.createPayloadIndex(COLLECTION_NAME, {
        field_name: fieldName,
        field_schema: 'keyword',
      });
      console.log('[VectordbService] Created payload index:', fieldName);
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err);
      if (!msg.includes('already exists') && !msg.includes('AlreadyExists')) {
        throw err;
      }
    }
  }

  /** Extract vector size from Qdrant config (single or named vectors) */
  private getVectorSizeFromConfig(vectors: unknown): number | null {
    if (!vectors || typeof vectors !== 'object') return null;
    const v = vectors as Record<string, unknown>;
    if (typeof v.size === 'number') return v.size;
    const named = v.default ?? Object.values(v)[0];
    if (
      named &&
      typeof named === 'object' &&
      typeof (named as { size?: number }).size === 'number'
    ) {
      return (named as { size: number }).size;
    }
    return null;
  }

  private readonly BATCH_SIZE = 50;

  /** Deterministic point ID from documentId + chunkIndex; retries overwrite previous points. */
  private toPointId(documentId: string, chunkIndex: number): string {
    const hash = createHash('sha256')
      .update(`${documentId}#${chunkIndex}`)
      .digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  /** Upsert/insert document chunks with metadata */
  async upsert(
    documentId: string,
    userId: string,
    chunks: Array<{ text: string; embedding: number[] }>,
    metadata?: { originalName?: string },
  ) {
    //Delete existing chunks for this document to ensure idempotency
    await this.client.delete(COLLECTION_NAME, {
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
    });

    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const points = batch.map((chunk, idx) => ({
        id: this.toPointId(documentId, i + idx),
        vector: Array.from(chunk.embedding),
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

  /** Remove all vector points for a document (e.g. on delete) */
  async deleteDocumentVectors(documentId: string): Promise<void> {
    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
    });
  }

  /** Search similar chunks (for RAG later) */
  async search(
    embedding: number[],
    topK = 5,
    filter?: { userId?: string; documentId?: string },
  ) {
    const vector = Array.from(embedding);
    // Collection uses anonymous vectors (vectors: { size, distance }), not named

    const result = await this.client.search(COLLECTION_NAME, {
      vector,
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

  private getEmbeddingDimension(provider: string): number {
    return provider === 'gemini'
      ? GEMINI_EMBEDDING_DIM
      : FASTEMBED_EMBEDDING_DIM;
  }
}
