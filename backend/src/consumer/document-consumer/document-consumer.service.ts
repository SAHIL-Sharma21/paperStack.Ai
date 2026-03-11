/**
 * Document Consumer Service - consumes document-processing topic and processes documents
 * @author: Sahil Sharma
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';
import { parseBrokers } from '../../modules/kafka/helper';
import { DocumentsService } from '../../modules/documents/documents.service';
import { StorageService } from '../../modules/storage/storage.service';
import {
  COMPLETED_STATUS,
  FAILED_STATUS,
} from '../../modules/documents/constant';
import * as fs from 'fs';
import { extractText } from '../../utils/text-extractor';
import { EmbeddingsService } from '../../modules/embeddings/embeddings.service';
import { VectordbService } from '../../modules/vectordb/vectordb.service';

@Injectable()
export class DocumentConsumerService implements OnModuleInit, OnModuleDestroy {
  private consumer: ReturnType<Kafka['consumer']>;

  constructor(
    private config: ConfigService,
    private documentsService: DocumentsService,
    private storageService: StorageService,
    private embeddingsService: EmbeddingsService,
    private vectordbService: VectordbService,
  ) {
    const raw = this.config.get<string>('KAFKA_BROKERS', 'localhost:9092');
    const brokers = parseBrokers(raw);
    const clientId = this.config.get<string>(
      'KAFKA_CLIENT_ID',
      'paperstack-backend',
    );
    const kafka = new Kafka({ clientId: `${clientId}-consumer`, brokers });
    this.consumer = kafka.consumer({
      groupId: 'paperstack-document-processor',
    });
  }

  async onModuleInit() {
    const topic = this.config.get<string>('KAFKA_TOPIC', 'document-processing');
    const fromBeginning =
      this.config.get<string>('KAFKA_FROM_BEGINNING', 'false') === 'true';
    await this.consumer.connect();
    await this.consumer.subscribe({ topic, fromBeginning: fromBeginning });
    console.log('[DocumentConsumer] Subscribed to', topic);

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const key = message.key?.toString();
        const value = message.value?.toString();
        console.log('[DocumentConsumer] Received', { topic, partition, key });
        try {
          const payload = value ? JSON.parse(value) : {};
          const documentId = payload.documentId ?? key;
          if (!documentId) {
            console.warn(
              '[DocumentConsumer] No documentId in message, skipping',
            );
            return;
          }
          await this.processDocument(documentId);
        } catch (err) {
          console.error('[DocumentConsumer] Error processing message:', err);
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect();
  }

  /**
   * this is the main function that processes the documents
   * it extracts the text from the document, chunks it and embeds it
   * and then upserts it into the vector database
   * @param documentId: string
   * @returns void
   * @throws Error if the document is not found.
   * */
  private async processDocument(documentId: string): Promise<void> {
    console.log('[DocumentConsumer] Processing document', documentId);
    const doc = await this.documentsService.findById(documentId);
    if (!doc) {
      console.warn('[DocumentConsumer] Document not found:', documentId);
      return;
    }
    if (doc.status === COMPLETED_STATUS) {
      console.log(
        '[DocumentConsumer] Already completed, skipping:',
        documentId,
      );
      return;
    }

    const fullPath = this.storageService.getFullPath(doc.storagePath);
    if (!fs.existsSync(fullPath)) {
      console.error('[DocumentConsumer] File not found:', fullPath);
      await this.documentsService.updateStatus(documentId, FAILED_STATUS);
      return;
    }

    try {
      const parsedText = await extractText(fullPath, doc.mimeType);
      console.log(
        '[DocumentConsumer] Extracted text length:',
        parsedText?.length ?? 0,
      );

      if (!parsedText || parsedText.trim().length === 0) {
        console.warn(
          '[DocumentConsumer] No text extracted from document:',
          documentId,
        );
        await this.documentsService.updateStatus(documentId, FAILED_STATUS);
        return;
      }

      const chunks = await this.embeddingsService.chunkAndEmbed(parsedText);
      console.log(
        '[DocumentConsumer] Chunked and embedded:',
        chunks.length,
        'chunks',
      );

      await this.vectordbService.upsert(
        documentId,
        doc.userId.toString(),
        chunks,
        { originalName: doc.originalName },
      );

      await this.documentsService.updateStatus(documentId, COMPLETED_STATUS);
      console.log('[DocumentConsumer] Document processed:', documentId);
    } catch (err) {
      console.error('[DocumentConsumer] Processing failed:', documentId, err);
      await this.documentsService.updateStatus(documentId, FAILED_STATUS);
    }
  }
}
